import Log from '../../../../util/Log'
import JID from '../../../../JID'
import Message from '../../../../Message'
import Translation from '../../../../util/Translation'
import MultiUserContact from '../../../../MultiUserContact'
import AbstractHandler from '../../AbstractHandler'

// body.replace(/^\/me /, '<i title="/me">' + Utils.removeHTML(this.sender.getName()) + '</i> ');

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
      let messageElement = $(stanza);
      let from = new JID(stanza.getAttribute('from'));
      let subjectElement = messageElement.find('subject');
      let bodyElement = messageElement.find('body:first');
      let originId = messageElement.find('origin-id[xmlns="urn:xmpp:sid:0"]').attr('id');
      let stanzaId = messageElement.find('stanza-id[xmlns="urn:xmpp:sid:0"]').attr('id');
      let attrId = messageElement.attr('id');
      let body = bodyElement.text();
      let nickname = from.resource;

      let contact = <MultiUserContact> this.account.getContact(from);
      if (typeof contact === 'undefined') {
         Log.info('Sender is not in our contact list')

         return this.PRESERVE_HANDLER;
      }

      if (contact.getType() !== 'groupchat') {
         Log.info('This groupchat message is not intended for a MultiUserContact');

         return this.PRESERVE_HANDLER;
      }

      if (subjectElement.length === 1 && bodyElement.length === 0) {
         contact.setSubject(subjectElement.text());

         let translatedMessage = Translation.t('changed_subject_to', {
            nickname,
            subject: contact.getSubject()
         });

         contact.addSystemMessage(':page_with_curl: ' + translatedMessage);

         return this.PRESERVE_HANDLER;
      }

      if (body !== '') {
         let delay = messageElement.find('delay[xmlns="urn:xmpp:delay"]');
         let sendDate = (delay.length > 0) ? new Date(delay.attr('stamp')) : new Date();
         let afterJoin = sendDate > contact.getJoinDate();

         if (contact.getNickname() === nickname && afterJoin) {
            Log.debug('Ignore my own groupchat messages');

            return this.PRESERVE_HANDLER;
         }

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

         let message = new Message({
            uid: stanzaId || originId,
            attrId,
            peer: from,
            direction: Message.DIRECTION.IN,
            plaintextMessage: body,
            // htmlMessage: htmlBody.html(),
            stamp: sendDate.getTime(),
            sender: {
               name: nickname
            },
            unread: afterJoin,
         });

         let pipe = this.account.getPipe('afterReceiveGroupMessage');

         pipe.run(contact, message).then(([contact, message]) => {
            contact.getTranscript().pushMessage(message);
         });
      }

      return this.PRESERVE_HANDLER;
   }
}
