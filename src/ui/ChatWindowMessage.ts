import { IMessage, DIRECTION, MessageMark } from '../Message.interface'
import DateTime from './util/DateTime'
import ChatWindow from './ChatWindow'
import AvatarSet from './AvatarSet'
import Log from '../util/Log'
import LinkHandlerGeo from '@src/LinkHandlerGeo';
import Color from '@util/Color';

let chatWindowMessageTemplate = require('../../template/chat-window-message.hbs')

export default class ChatWindowMessage {
   private element;

   constructor(private message: IMessage, private chatWindow: ChatWindow) {
      this.generateElement();
      this.registerHooks();
   }

   public getElement() {
      return this.element;
   }

   public restoreNextMessage() {
      let nextMessage = this.getNextMessage();

      if (!nextMessage || nextMessage.getDOM().length > 0) {
         return;
      }

      let chatWindowMessage = this.chatWindow.getChatWindowMessage(nextMessage);
      let element = chatWindowMessage.getElement();

      this.getElement().after(element);
      chatWindowMessage.restoreNextMessage();
   }

   private getNextMessage() {
      let nextId = this.message.getNextId();

      if (!nextId) {
         return;
      }

      let nextMessage = this.chatWindow.getTranscript().getMessage(nextId);

      if (!nextMessage) {
         Log.warn('Couldnt find next message.');
         return;
      }

      return nextMessage;
   }

   private async generateElement() {
      let template = chatWindowMessageTemplate({
         id: this.message.getCssId(),
         direction: this.message.getDirectionString()
      });

      this.element = $(template);

      let bodyElement = $(await this.message.getProcessedBody());

      LinkHandlerGeo.get().detect(bodyElement);

      this.element.find('.jsxc-content').html(bodyElement);

      let timestampElement = this.element.find('.jsxc-timestamp');
      DateTime.stringify(this.message.getStamp().getTime(), timestampElement);

      if (this.message.getDirection() === DIRECTION.OUT || this.message.getDirection() === DIRECTION.PROBABLY_OUT) {
         this.element.attr('data-mark', MessageMark[this.message.getMark()]);
      }

      if (this.message.isForwarded()) {
         this.element.addClass('jsxc-forwarded');
      }

      if (this.message.isEncrypted()) {
         this.element.addClass('jsxc-encrypted');
      }

      if (this.message.isUnread()) {
         this.element.addClass('jsxc-unread');
      }

      if (this.message.getErrorMessage()) {
         this.element.addClass('jsxc-error');
         this.element.attr('title', this.message.getErrorMessage());
      }

      if (this.message.hasAttachment()) {
         this.addAttachmentToElement();
      }

      if (this.message.getDirection() === DIRECTION.SYS) {
         this.element.find('.jsxc-message-area').append('<div class="jsxc-clear"/>');
      } else if (this.message.getDirection() === DIRECTION.IN) {
         let text = this.message.getSender().name || this.message.getPeer().bare;
         let lightness = 90;
         let color = Color.generate(text, undefined, 40, lightness);

         this.element.addClass(lightness < 60 ? 'jsxc-dark' : 'jsxc-light'); //lgtm [js/useless-comparison-test]
         this.element.css('--jsxc-message-bg', color);
      }

      let sender = this.message.getSender();
      if (typeof sender.name === 'string') {
         this.addSenderToElement();
      }
   }

   private addAttachmentToElement() {
      let attachment = this.message.getAttachment();
      let mimeType = attachment.getMimeType();
      let attachmentElement = $('<div>');
      attachmentElement.addClass('jsxc-attachment');
      attachmentElement.addClass('jsxc-' + mimeType.replace(/\//, '-'));
      attachmentElement.addClass('jsxc-' + mimeType.replace(/^([^/]+)\/.*/, '$1'));

      if (attachment.isPersistent()) {
         attachmentElement.addClass('jsxc-persistent');
      }

      if (attachment.isImage() && attachment.hasThumbnailData()) {
         $('<img>')
            .attr('alt', 'preview')
            .attr('src', attachment.getThumbnailData())
            // .attr('title', message.getName())
            .appendTo(attachmentElement);
      } else {
         attachmentElement.text(attachment.getName());

         attachmentElement.removeClass('jsxc-' + mimeType.replace(/\//, '-'));
      }

      if (attachment.hasData()) {
         attachmentElement = $('<a>').append(attachmentElement);
         attachmentElement.attr('href', attachment.getData());
         attachmentElement.attr('download', attachment.getName());

         //@REVIEW this is a dirty hack
         let linkElement = this.element.find('.jsxc-content a:eq(0)');
         if (linkElement.next().is('br')) {
            linkElement.next().remove();
         }
         this.element.find('.jsxc-content a:eq(0)').remove();
      }

      this.element.find('div').first().prepend(attachmentElement);
   }

   private addSenderToElement() {
      let sender = this.message.getSender();
      let title = sender.name;

      if (sender.jid && sender.jid.bare) {
         title += '\n' + sender.jid.bare;
      }

      let senderElement = this.element.find('.jsxc-sender');
      senderElement.text(sender.name + ': ');

      let avatarElement = $('<div>');
      avatarElement.addClass('jsxc-avatar');
      avatarElement.attr('title', title);

      this.element.prepend(avatarElement);
      this.element.attr('data-name', sender.name);

      let nextMessage = this.getNextMessage();

      if (nextMessage && nextMessage.getSender().name === sender.name) {
         avatarElement.css('visibility', 'hidden');

         return;
      }

      let contact = sender.jid && this.chatWindow.getContact(sender.jid);

      if (contact) {
         AvatarSet.get(contact).addElement(avatarElement);
      } else {
         AvatarSet.setPlaceholder(avatarElement, sender.name, sender.jid);
      }
   }

   private registerHooks() {
      this.message.registerHook('encrypted', (encrypted) => {
         if (encrypted) {
            this.element.addClass('jsxc-encrypted');
         } else {
            this.element.removeClass('jsxc-encrypted');
         }
      });

      this.message.registerHook('unread', (unread) => {
         if (!unread) {
            this.element.removeClass('jsxc-unread');
         }
      });

      this.message.registerHook('progress', (progress) => {
         this.element.find('.jsxc-attachment').attr('data-progress', Math.round(progress * 100) + '%');
      })

      if (this.message.getDirection() === DIRECTION.OUT || this.message.getDirection() === DIRECTION.PROBABLY_OUT) {
         this.message.registerHook('mark', (mark) => {
            this.element.attr('data-mark', MessageMark[mark]);
         });
      }

      this.message.registerHook('next', (nextId) => {
         if (nextId) {
            this.restoreNextMessage();
         }
      });

      this.message.registerHook('errorMessage', (errorMessage) => {
         if (errorMessage) {
            this.element.addClass('jsxc-error');
            this.element.attr('title', errorMessage);
         } else {
            this.element.removeClass('jsxc-error');
            this.element.attr('title', null);
         }
      })
   }
}
