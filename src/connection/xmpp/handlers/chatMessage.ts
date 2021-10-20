import Log from '../../../util/Log';
import JID from '../../../JID';
import Message from '../../../Message';
import Utils from '../../../util/Utils';
import Translation from '../../../util/Translation';
import AbstractHandler from '../AbstractHandler';
import { FUNCTION } from '../../../Notice';
import { MessageMark } from '@src/Message.interface';
import { MessageElement } from '../MessageElement';

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      let messageElement: MessageElement;

      try {
         messageElement = new MessageElement(stanza);
      } catch (err) {
         return this.PRESERVE_HANDLER;
      }

      if (!messageElement.getPeer()) {
         return this.PRESERVE_HANDLER;
      }

      let peerJid = new JID(messageElement.getPeer());
      let peerContact = this.account.getContact(peerJid);
      if (typeof peerContact === 'undefined') {
         this.handleUnknownSender(messageElement);

         return this.PRESERVE_HANDLER;
      }

      if (!peerContact.isGroupChat()) {
         // If we now the full jid, we use it
         peerContact.setResource(peerJid.resource);
      }

      let message = new Message({
         uid: messageElement.getStanzaId(),
         attrId: messageElement.getId(),
         peer: peerJid,
         direction: messageElement.getDirection(),
         plaintextMessage: messageElement.getPlaintextBody(),
         htmlMessage: messageElement.getHtmlBody().html(),
         forwarded: messageElement.isForwarded(),
         stamp: messageElement.getTime().getTime(),
         unread: messageElement.isIncoming(),
         mark: MessageMark.transferred,
      });

      message.setReplaceId(messageElement.getReplaceId());
      message.setOccupantId(messageElement.getOccupantId());
      message.setRetractId(messageElement.getRetractId());

      let pipe = this.account.getPipe('afterReceiveMessage');

      pipe.run(peerContact, message, messageElement.get(0)).then(([contact, message]) => {
         if (message.getPlaintextMessage() || message.getHtmlMessage() || message.hasAttachment()) {
            contact.getTranscript().pushMessage(message);
         } else {
            message.delete();
         }
      });

      return this.PRESERVE_HANDLER;
   }

   private handleUnknownSender(messageElement: MessageElement) {
      Log.debug('Sender is not in our contact list');

      let fromJid = new JID(messageElement.getFrom());

      let title = Translation.t('Unknown_sender');
      let description = Translation.t('You_received_a_message_from_an_unknown_sender_', {
         sender: fromJid.bare,
      });

      description += `\n\n>>>${Utils.escapeHTML(messageElement.getPlaintextBody())}<<<`;

      //@REVIEW maybe improve the dialog
      this.account.getNoticeManager().addNotice({
         title,
         description,
         fnName: FUNCTION.unknownSender,
         fnParams: [this.account.getUid(), title, description, fromJid.full],
      });
   }
}