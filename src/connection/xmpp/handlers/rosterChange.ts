import Log from '../../../util/Log'
import JID from '../../../JID'
import Client from '../../../Client'
import Roster from '../../../ui/Roster'
import AbstractHandler from '../AbstractHandler'
import { ContactSubscription as SUBSCRIPTION } from '../../../Contact.interface'

// let SUBSCRIPTION = {
//    REMOVE: 'remove',
//    FROM: 'from',
//    BOTH: 'both'
// };
let PRESENCE = {
   ERROR: 'error',
   SUBSCRIBE: 'subscribe',
   UNAVAILABLE: 'unavailable',
   UNSUBSCRIBED: 'unsubscribed'
};

export default class extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      let fromString = $(stanza).attr('from');
      let fromJid;

      if (fromString) {
         fromJid = new JID(fromString);
      }

      let account = this.account;

      if (fromJid && fromJid.bare !== account.getJID().bare) {
         Log.info('Ignore roster change with wrong sender jid.');

         return this.PRESERVE_HANDLER;
      }

      Log.debug('Process roster change.');

      let itemElement = $(stanza).find('item');

      if (itemElement.length !== 1) {
         Log.info('Ignore roster change with more than one item element.');

         return this.PRESERVE_HANDLER;
      }

      let jid = new JID($(itemElement).attr('jid'));
      let name = $(itemElement).attr('name') || jid.bare;
      let subscription = $(itemElement).attr('subscription');

      let contact = account.getContact(jid);

      if (!contact && subscription === SUBSCRIPTION.REMOVE) {
         return this.PRESERVE_HANDLER;
      } else if (contact) {
         if (subscription === SUBSCRIPTION.REMOVE) {
            account.removeContact(contact);
         } else if (subscription === SUBSCRIPTION.FROM || subscription === SUBSCRIPTION.BOTH) {
            contact.setName(name);
            contact.setSubscription(<SUBSCRIPTION> subscription);
         }
      } else {
         //@REVIEW DRY same code as in roster handler
         contact = account.addContact(jid, name);
         contact.setSubscription(<SUBSCRIPTION> subscription);

         Roster.get().add(contact);
      }

      if (subscription === SUBSCRIPTION.FROM || subscription === SUBSCRIPTION.BOTH) {
         //@TODO Remove pending friendship request from notice list
      }

      //@REVIEW DRY roster handler
      let rosterVersion = $(stanza).find('query').attr('ver');

      if (rosterVersion) {
         let storage = account.getStorage();

         storage.setItem('roster', 'version', rosterVersion);

         let cache = storage.getItem('roster', 'cache') || [];

         if (cache.indexOf(contact.getId()) < 0) {
            cache.push(contact.getId());

            storage.setItem('roster', 'cache', cache);
         }
      }

      return this.PRESERVE_HANDLER;
   }
}
