import Log from '../../../util/Log'
import JID from '../../../JID'
import Client from '../../../Client'
import Account from '../../../Account'
import Roster from '../../../ui/Roster'
import AbstractHandler from '../AbstractHandler'

export default class RosterHandler extends AbstractHandler {
   public processStanza(stanzaElement:Element):boolean {
      Log.debug('Load roster', stanzaElement);

      let account = this.account;
      let stanza = $(stanzaElement);
      let toJid = new JID(stanza.attr('to'));

      if (stanza.find('query').length === 0) {
         Log.debug('Use cached roster');

         return this.REMOVE_HANDLER;
      }

      stanza.find('item').each(function() {
         let item = $(this);
         let jid = new JID(item.attr('jid'));
         let name = item.attr('name') || jid.bare;
         let subscription = item.attr('subscription');

         let contact = account.addContact(jid, name);
         contact.setSubscription(subscription);

         Roster.get().add(contact);
      });

      let rosterVersion = $(stanza).find('query').attr('ver');

      if (rosterVersion) {
         account.getStorage().setItem('roster', 'version', rosterVersion);
      }

      return this.REMOVE_HANDLER;
   }
}
