//import {} from '../handler'
import * as NS from '../namespace'
import Log from '../../../util/Log'
import JID from '../../../JID'
import Message from '../../../Message'
import Utils from '../../../util/Utils'
import Translation from '../../../util/Translation'
import AbstractHandler from '../AbstractHandler'
import { Strophe } from '../../../vendor/Strophe'
import { FUNCTION } from '../../../Notice'

export default class extends AbstractHandler {

   public processStanza(stanza: Element) {
      let messageElement;

      try {
         messageElement = new MessageElement(stanza);
      } catch (err) {
         return this.PRESERVE_HANDLER;
      }

      let peerJid = new JID(messageElement.getOriginalFrom());
      let peerContact = this.account.getContact(peerJid);
      let nickname: string = $(stanza).find('nick').text();
      let oldName: string = peerContact.getNickname();
      if ((nickname !== undefined) && (oldName !== nickname)) {
         peerContact.setNickname(nickname);
      }

      if (typeof peerContact === 'undefined') {
         this.handleUnknownSender(messageElement);

         return this.PRESERVE_HANDLER;
      }

      // If we know the full jid, we use it
      peerContact.setResource(peerJid.resource);

      let message = new Message({
         uid: messageElement.getStanzaId(),
         attrId: messageElement.getId(),
         peer: peerJid,
         direction: messageElement.getDirection(),
         plaintextMessage: messageElement.getPlaintextBody(),
         htmlMessage: messageElement.getHtmlBody().html(),
         forwarded: messageElement.isForwarded(),
         stamp: messageElement.getTime(),
         unread: true //@REVIEW carbon copy?
      });

      let pipe = this.account.getPipe('afterReceiveMessage');

      pipe.run(peerContact, message, messageElement.get(0)).then(([contact, message]) => {
         if (message.getPlaintextMessage() || message.getHtmlMessage()) {
            contact.getTranscript().pushMessage(message);
         }
      });

      return this.PRESERVE_HANDLER;
   }

   private handleUnknownSender(messageElement: MessageElement) {
      Log.debug('Sender is not in our contact list');

      let title = Translation.t('Unknown_sender');
      let description = Translation.t('You_received_a_message_from_an_unknown_sender_') + ` (${messageElement.getFrom().bare})`;

      //@REVIEW maybe improve the dialog
      this.account.getNoticeManager().addNotice({
         title,
         description,
         fnName: FUNCTION.notification,
         fnParams: [title, description],
      });
   }
}

class MessageElement {
   private element;
   private originalElement;
   private forwarded = false;
   private carbon = false;
   private direction = Message.DIRECTION.IN;

   constructor(stanza: Element) {
      this.originalElement = $(stanza);

      this.findMessageElement(stanza);
   }

   private findMessageElement(stanza: Element) {
      let forwardedStanza = $(stanza).find('forwarded' + NS.getFilter('FORWARD'));

      let from = new JID($(stanza).attr('from'));
      let to = new JID($(stanza).attr('to'));

      if (forwardedStanza.length === 0) {
         this.element = $(stanza);

         return;
      }

      let carbonStanza = $(stanza).find('> ' + NS.getFilter('CARBONS'));

      this.element = forwardedStanza.find('> message');
      this.forwarded = true;

      if (carbonStanza.length === 0) {
         return;
      }

      if (from.bare === to.bare) {
         this.carbon = true;
         this.direction = (carbonStanza.prop('tagName') === 'sent') ? Message.DIRECTION.OUT : Message.DIRECTION.IN;

         return;
      }

      throw new Error('No message element found');
   }

   public isForwarded() {
      return this.forwarded;
   }

   public isCarbon() {
      return this.carbon;
   }

   public find(selector) {
      return this.element.find(selector);
   }

   public get(index?) {
      return this.element.get(index);
   }

   public getType() {
      return this.element.attr('type');
   }

   public getFrom() {
      return this.element.attr('from');
   }

   public getTo() {
      return this.element.attr('to');
   }

   public getOriginalFrom() {
      return this.isCarbon() ? this.getFrom() : this.originalElement.attr('from');
   }

   public getOriginalTo() {
      return this.originalElement.attr('to');
   }

   public getId() {
      return this.element.attr('id');
   }

   public getStanzaId() {
      //@REVIEW "by" attribute ?
      let stanzaIdElement = this.element.find('stanza-id[xmlns="urn:xmpp:sid:0"]');

      return stanzaIdElement.attr('id');
   }

   public getTime() {
      let delayElement = this.element.find('delay[xmlns="urn:xmpp:delay"]');
      let stamp = (delayElement.length > 0) ? new Date(delayElement.attr('stamp')) : new Date();

      return stamp;
   }

   public getPlaintextBody() {
      let body = Utils.removeHTML(this.element.find('> body').text());

      if (this.forwarded && !this.carbon) {
         return `${this.getOriginalFrom()} ${Translation.t('to')} ${this.getOriginalFrom()} "${body}"`;
      }

      return body;
   }

   public getHtmlBody() {
      return this.element.find('html body[xmlns="' + Strophe.NS.XHTML + '"]');
   }

   public getDirection() {
      return this.direction;
   }
}
