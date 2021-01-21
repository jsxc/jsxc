import { IContact } from '@src/Contact.interface';
import Message from '@src/Message';
import { IMessage } from '@src/Message.interface';
import Log from '@util/Log';
import Translation from '@util/Translation';
import JID from '../../../JID'
import AbstractHandler from '../AbstractHandler'
import { MessageElement } from '../MessageElement'

export default class extends AbstractHandler {

   public processStanza(stanza: Element) {
      let messageElement: MessageElement;

      try {
         messageElement = new MessageElement(stanza);
      } catch (err) {
         return this.PRESERVE_HANDLER;
      }

      let peer = messageElement.getPeer();

      // workaround for broken OpenFire implementation
      if (!peer || peer === this.account.getJID().full) {
         let attrId = messageElement.getId();

         if (Message.exists(attrId)) {
            let message = new Message(attrId);

            peer = message.getPeer().bare;
         } else {
            peer = this.getPeerByMessageAttrId(attrId);
         }

         if (!peer) {
            return  this.PRESERVE_HANDLER;
         }
      }

      let peerJid = new JID(peer);
      let peerContact = this.account.getContact(peerJid);

      if (typeof peerContact === 'undefined') {
         return this.PRESERVE_HANDLER;
      }

      let errorElement = messageElement.find('error');

      Log.warn('Message error: ', errorElement.find('text[xmlns="urn:ietf:params:xml:ns:xmpp-stanzas"]').text() || 'no description provided');

      let message = peerContact.getTranscript().findMessageByAttrId(messageElement.getId());

      let pipe = this.account.getPipe<[IContact, IMessage, Element]>('afterReceiveErrorMessage');

      pipe.run(peerContact, message, messageElement.get(0)).then(([contact, message]) => {
         if (message && !message.getErrorMessage()) {
            message.setErrorMessage(Translation.t('message_not_delivered'));
         }
      });

      return this.PRESERVE_HANDLER;
   }

   private getPeerByMessageAttrId(id: string) {
      return $('.jsxc-chatmessage[id="' + id + '"]').closest('[data-jid]').attr('data-jid');
   }
}
