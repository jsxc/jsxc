import { IMessage, DIRECTION } from '../Message.interface'
import DateTime from './util/DateTime'
import JID from '../JID'
import ChatWindow from './ChatWindow'
import AvatarSet from './AvatarSet'
import Log from '../util/Log'

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

      this.getElement().before(element);
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

   private generateElement() {
      let template = chatWindowMessageTemplate({
         id: this.message.getCssId(),
         direction: this.message.getDirectionString()
      });

      this.element = $(template);

      this.element.find('.jsxc-content').html(this.message.getProcessedBody());

      let timestampElement = this.element.find('.jsxc-timestamp');
      DateTime.stringify(this.message.getStamp().getTime(), timestampElement);

      if (this.message.isReceived()) {
         this.element.addClass('jsxc-received');
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
         // @REVIEW maybe set background color to avatar color; use source color if available
         // this.element.css('background-color', Color.generate(this.message.getPeer().bare));
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
      }

      if (attachment.hasData()) {
         attachmentElement = $('<a>').append(attachmentElement);
         attachmentElement.attr('href', attachment.getData());
         attachmentElement.attr('download', attachment.getName());

         //@REVIEW this is a dirty hack
         this.element.find('.jsxc-content a[href="' + attachment.getData() + '"]').remove();
      }

      this.element.find('div').first().prepend(attachmentElement);
   }

   private addSenderToElement() {
      let sender = this.message.getSender();
      let title = sender.name;

      if (sender.jid instanceof JID) {
         title += '\n' + sender.jid.bare;
      }

      let timestampElement = this.element.find('.jsxc-timestamp');
      timestampElement.text(sender.name + ': ' + timestampElement.text());

      let avatarElement = $('<div>');
      avatarElement.addClass('jsxc-avatar');
      avatarElement.attr('title', title);

      this.element.prepend(avatarElement)
      this.element.attr('data-name', sender.name);

      let nextMessage = this.getNextMessage();

      if (nextMessage && nextMessage.getSender().name === sender.name) {
         avatarElement.css('visibility', 'hidden');
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

      this.message.registerHook('received', (isReceived) => {
         if (isReceived) {
            this.element.addClass('jsxc-received');
         } else {
            this.element.removeClass('jsxc-received');
         }
      });

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
