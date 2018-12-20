import Log from '../../../util/Log'
import JID from '../../../JID'
import Roster from '../../../ui/Roster'
import AbstractHandler from '../AbstractHandler'
import { ContactSubscription as SUBSCRIPTION } from '../../../Contact.interface'
import Storage from 'Storage.interface';
import Account from 'Account';

export default class RosterHandler extends AbstractHandler {
   public processStanza(stanzaElement: Element): boolean {
      Log.debug('Load roster', stanzaElement);

      let account = this.account;
      let storage = account.getStorage();
      let stanza = $(stanzaElement);
      let toJid = new JID(stanza.attr('to'));

      if (stanza.find('query').length === 0) {
         Log.debug('Use cached roster');

         restoreRosterFromCache(account, storage);

         return this.REMOVE_HANDLER;
      }

      let cache = [];

      stanza.find('item').each(function() {
         let item = $(this);
         let jid = new JID(item.attr('jid'));
         let name = item.attr('name') || jid.bare;
         let subscription = item.attr('subscription');

         let contact = account.addContact(jid, name);
         contact.setSubscription(<SUBSCRIPTION> subscription);

         cache.push(contact.getId());

         Roster.get().add(contact);
      });

      let rosterVersion = $(stanza).find('query').attr('ver');

      if (!rosterVersion) {
         cache = [];
      }

      storage.setItem('roster', 'version', rosterVersion);
      storage.setItem('roster', 'cache', cache);

      return this.REMOVE_HANDLER;
   }
}

function restoreRosterFromCache(account: Account, storage: Storage) {
   let cachedRoster = storage.getItem('roster', 'cache') || [];

   for (let id of cachedRoster) {
      try {
         let contact = account.addContact(id);
         contact.clearResources();

         Roster.get().add(contact);
      } catch (err) {
         Log.warn('Could not restore contact from cached roster.', err);
      }
   }
}
