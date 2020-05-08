import * as NS from '../namespace'
import Log from '../../../util/Log'
import JID from '../../../JID'
import Message from '../../../Message'
import Utils from '../../../util/Utils'
import Translation from '../../../util/Translation'
import AbstractHandler from '../AbstractHandler'
import { Strophe } from '../../../vendor/Strophe'
import { FUNCTION } from '../../../Notice'
import { MessageMark } from '@src/Message.interface'

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

      // If we now the full jid, we use it
      peerContact.setResource(peerJid.resource);

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

      let pipe = this.account.getPipe('afterReceiveMessage');

      pipe.run(peerContact, message, messageElement.get(0)).then(([contact, message]) => {
         if (message.getPlaintextMessage() || message.getHtmlMessage()) {
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

class MessageElement {
   private element: JQuery<Element>;
   private originalElement: JQuery<Element>;
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

      if (carbonStanza.get(0) !== forwardedStanza.parent().get(0)) {
         throw new Error('Forwarded message is not part of carbon copy');
      }

      this.element = forwardedStanza.find('> message');
      this.forwarded = true;

      if (carbonStanza.length === 0) {
         return;
      }

      if (from.bare === to.bare) {
         let carbonTagName = <string> carbonStanza.prop('tagName') || '';

         this.carbon = true;
         this.direction = (carbonTagName.toLowerCase() === 'sent') ? Message.DIRECTION.OUT : Message.DIRECTION.IN;

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

   public isIncoming() {
      return this.direction === Message.DIRECTION.IN;
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

   public getPeer() {
      if (this.isCarbon() && this.getDirection() === Message.DIRECTION.OUT) {
         return this.getTo();
      } else {
         return this.getFrom();
      }
   }

   public getOriginalFrom() {
      return this.originalElement.attr('from');
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
         return `${this.getOriginalFrom()} ${Translation.t('to')} ${this.getOriginalTo()} "${body}"`;
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
