import JID from '../../../JID';
import AbstractHandler from '../AbstractHandler';

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      let from = new JID($(stanza).attr('from'));
      let peerContact = this.account.getContact(from);
      if (typeof peerContact === 'undefined') {
         return this.PRESERVE_HANDLER;
      }

      let nick = $(stanza).find('nick[xmlns="http://jabber.org/protocol/nick"]');
      if (nick.length > 0 && from.bare === this.account.getContact().getJid().bare) {
         this.account.setDefaultNickname($(nick).text());
         return this.PRESERVE_HANDLER;
      }

      return this.PRESERVE_HANDLER;
   }
}
