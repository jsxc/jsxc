import Log from '../../../../util/Log';
import JID from '../../../../JID';
import MultiUserContact from '../../../../MultiUserContact';
import AbstractHandler from '../../AbstractHandler';
import MultiUserPresenceProcessor from './PresenceProcessor';
import Translation from '@util/Translation';

const possibleErrorConditions = [
   'not-authorized',
   'forbidden',
   'item-not-found',
   'not-allowed',
   'not-acceptable',
   'registration-required',
   'conflict',
   'service-unavailable',
];

export default class extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      Log.debug('onMultiUserPresence', stanza);

      let from = new JID($(stanza).attr('from'));
      let type = $(stanza).attr('type');

      let multiUserContact = this.account.getContact(from);

      if (!(multiUserContact instanceof MultiUserContact)) {
         return this.PRESERVE_HANDLER;
      }

      let nickname = from.resource;

      if (type === 'error') {
         if (from.resource === multiUserContact.getNickname()) {
            let errorElement = $(stanza).find('error');
            let errorReason = errorElement
               .find('[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]')
               .first()
               ?.prop('tagName')
               ?.toLowerCase();

            if (possibleErrorConditions.includes(errorReason)) {
               multiUserContact.addSystemMessage(Translation.t('muc_' + errorReason));
            }
         }

         return this.PRESERVE_HANDLER;
      }

      let xElement = $(stanza).find('x[xmlns="http://jabber.org/protocol/muc#user"]');

      if (xElement.length === 0) {
         return this.PRESERVE_HANDLER;
      }

      new MultiUserPresenceProcessor(multiUserContact, xElement, nickname, type);

      return this.PRESERVE_HANDLER;
   }
}
