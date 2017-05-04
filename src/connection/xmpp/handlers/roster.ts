import Log from '../../../util/Log'
import JID from '../../../JID'
import Client from '../../../Client'
import Account from '../../../Account'
import ContactData from '../../../ContactData'

const REMOVE_HANDLER = false;

export default function onRoster(stanzaElement: Element): boolean {
   Log.debug('Load roster', stanzaElement);

   let stanza = $(stanzaElement);
   let toJid = new JID(stanza.attr('to'));
   let account:Account = Client.getAccout(toJid);

   if (stanza.find('query').length === 0) {
      Log.debug('Use cached roster');

      // jsxc.restoreRoster();
      return REMOVE_HANDLER;
   }

   stanza.find('item').each(function() {
      let item = $(this);
      let jid = new JID(item.attr('jid'));
      let name = item.attr('name') || jid.bare;
      let subscription = item.attr('subscription');

      account.addContact(new ContactData({
         jid: jid,
         name: name,
         sub: subscription
      }));
   });

   if (stanza.find('query').attr('ver')) {
      account.getStorage().setItem('roster', 'version', stanza.find('query').attr('ver'));
   }

   return REMOVE_HANDLER;
}
