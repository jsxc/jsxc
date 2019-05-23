import Log from '../../../../util/Log'
import JID from '../../../../JID'
import MultiUserContact from '../../../../MultiUserContact'
import AbstractHandler from '../../AbstractHandler'
import MultiUserPresenceProcessor from './PresenceProcessor'

export default class extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      Log.debug('onMultiUserPresence', stanza);

      let from = new JID($(stanza).attr('from'));
      let type = $(stanza).attr('type');

      let xElement = $(stanza).find('x[xmlns="http://jabber.org/protocol/muc#user"]');
      let multiUserContact = this.account.getContact(from);

      if (!(multiUserContact instanceof MultiUserContact) || xElement.length === 0) {
         return this.PRESERVE_HANDLER;
      }

      let nickname = from.resource;

      new MultiUserPresenceProcessor(multiUserContact, xElement, nickname, type);

      return this.PRESERVE_HANDLER;
   }
}
