import Log from '../../../util/Log'
import JID from '../../../JID'
import Client from '../../../Client'
import Roster from '../../../ui/Roster'
import AbstractHandler from '../AbstractHandler'
import { ContactSubscription as SUBSCRIPTION } from '../../../ContactInterface'

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
            contact.setSubscription(<SUBSCRIPTION>subscription);

            //@TODO refresh roster position
         }
      } else {
         //@REVIEW DRY same code as in roster handler
         contact = account.addContact(jid, name);
         contact.setSubscription(<SUBSCRIPTION>subscription);

         Roster.get().add(contact);
      }


      // Remove pending friendship request from notice list
      if (subscription === SUBSCRIPTION.FROM || subscription === SUBSCRIPTION.BOTH) {
         // var notices = jsxc.storage.getUserItem('notices');
         // var noticeKey = null,
         //    notice;
         //
         // for (noticeKey in notices) {
         //    notice = notices[noticeKey];
         //
         //    if (notice.fnName === 'gui.showApproveDialog' && notice.fnParams[0] === jid) {
         //       jsxc.debug('Remove notice with key ' + noticeKey);
         //
         //       jsxc.notice.remove(noticeKey);
         //    }
         // }
      }

      //@REVIEW DRY roster handler
      let rosterVersion = $(stanza).find('query').attr('ver');

      if (rosterVersion) {
         account.getStorage().setItem('roster', 'version', rosterVersion);
      }

      return this.PRESERVE_HANDLER;
   }
}
