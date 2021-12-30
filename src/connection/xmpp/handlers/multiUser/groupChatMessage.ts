import Log from '../../../../util/Log';
import JID from '../../../../JID';
import Message from '../../../../Message';
import Translation from '../../../../util/Translation';
import MultiUserContact from '../../../../MultiUserContact';
import AbstractHandler from '../../AbstractHandler';
import { MessageMark } from '@src/Message.interface';
import MultiUserStatusCodeHandler from './StatusCodeHandler';

// body.replace(/^\/me /, '<i title="/me">' + Utils.removeHTML(this.sender.getName()) + '</i> ');

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      let messageElement = $(stanza);
      let from = new JID(stanza.getAttribute('from'));
      let subjectElement = messageElement.find('subject');
      let bodyElement = messageElement.find('>body:first');
      let originId = messageElement.find('origin-id[xmlns="urn:xmpp:sid:0"]').attr('id');
      let stanzaId = messageElement.find('stanza-id[xmlns="urn:xmpp:sid:0"]').attr('id');
      let attrId = messageElement.attr('id');
      let body = bodyElement.text();
      let nickname = from.resource;
      let replaceId =
         messageElement.find('replace[xmlns="urn:xmpp:message-correct:0"]').length > 0
            ? messageElement.find('replace[xmlns="urn:xmpp:message-correct:0"]').attr('id')
            : null;
      let occupantId =
         messageElement.find('occupant-id[xmlns="urn:xmpp:occupant-id:0"]').length > 0
            ? messageElement.find('occupant-id[xmlns="urn:xmpp:occupant-id:0"]').attr('id')
            : null;
      let retractId = null;

      if (
         messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').length > 0 &&
         messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').find('retract[xmlns="urn:xmpp:message-retract:0"]')
            .length > 0
      ) {
         retractId = messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').attr('id');
      }

      let styled = messageElement.find('unstyled[xmlns="urn:xmpp:styling:0"]').length > 0 ? false : true;

      if (retractId !== null) {
         replaceId = null;
      }

      let contact = <MultiUserContact>this.account.getContact(from);
      if (typeof contact === 'undefined') {
         Log.info('Sender is not in our contact list');

         return this.PRESERVE_HANDLER;
      }

      if (contact.getType() !== 'groupchat') {
         Log.info('This groupchat message is not intended for a MultiUserContact');

         return this.PRESERVE_HANDLER;
      }

      if (subjectElement.length === 1 && bodyElement.length === 0) {
         let subject = subjectElement.text();
         let oldSubject = contact.getSubject();

         if (subject === oldSubject) {
            return this.PRESERVE_HANDLER;
         }

         contact.setSubject(subject);

         let translatedMessage = null;

         if (subject !== '') {
            //if room was created with standard configuration, then there is no topic at all
            if (nickname !== '') {
               //if the message comes from the muc service instead of the user, then its a bare jid without nickname
               translatedMessage = Translation.t('changed_subject_to', {
                  nickname,
                  subject,
               });
            } else {
               translatedMessage = Translation.t('subject_was_changed', {
                  subject,
               });
            }

            contact.addSystemMessage(':page_with_curl: ' + translatedMessage);
         }

         return this.PRESERVE_HANDLER;
      }

      if (!nickname) {
         const codes = $(stanza)
            .find('x[xmlns="http://jabber.org/protocol/muc#user"]')
            .find('status')
            .map((index, element) => element.getAttribute('code'))
            .get();

         MultiUserStatusCodeHandler.processCodes(codes, contact);
      }

      if (body === '') {
         return this.PRESERVE_HANDLER;
      }

      let delay = messageElement.find('delay[xmlns="urn:xmpp:delay"]');
      let sendDate = delay.length > 0 ? new Date(delay.attr('stamp')) : new Date();
      let afterJoin = sendDate > contact.getJoinDate();
      let direction = afterJoin ? Message.DIRECTION.IN : Message.DIRECTION.PROBABLY_IN;

      let transcript = contact.getTranscript();

      if (!afterJoin) {
         if (Message.exists(originId) || Message.exists(stanzaId)) {
            return this.PRESERVE_HANDLER;
         }

         for (let message of transcript.getGenerator()) {
            if (message.getAttrId() === attrId && message.getPlaintextMessage() === body) {
               return this.PRESERVE_HANDLER;
            }
         }
      }

      let member = contact.getMember(nickname);
      let uid = stanzaId || originId;
      let unread = afterJoin;
      let sender = {
         name: nickname,
         jid: member && member.jid,
      };

      if (contact.getNickname() === nickname) {
         if (afterJoin) {
            if (Message.exists(originId)) {
               let message = new Message(originId);

               message.received();

               return this.PRESERVE_HANDLER;
            }

            direction = Message.DIRECTION.OUT;
            uid = originId;
            unread = false;
            sender = undefined;
         } else {
            direction = Message.DIRECTION.PROBABLY_OUT;
         }
      }

      let message = new Message({
         uid,
         attrId,
         peer: from,
         direction,
         plaintextMessage: body,
         // htmlMessage: htmlBody.html(),
         stamp: sendDate.getTime(),
         sender,
         unread,
         mark: MessageMark.transferred,
      });

      message.setReplaceId(typeof replaceId === 'string' ? replaceId : null);
      message.setOccupantId(typeof occupantId === 'string' ? occupantId : null);
      message.setRetractId(typeof retractId === 'string' ? retractId : null);
      message.setStyled(styled);

      if (direction === Message.DIRECTION.OUT) {
         message.received();
      }

      let pipe = this.account.getPipe('afterReceiveGroupMessage');

      pipe.run(contact, message, messageElement.get(0)).then(([contact, message]) => {
         contact.getTranscript().pushMessage(message);
      });

      return this.PRESERVE_HANDLER;
   }
}
