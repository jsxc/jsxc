import Message from '../Message'
import DateTime from './util/DateTime'
import JID from '../JID'
import ChatWindow from './ChatWindow'

let chatWindowMessageTemplate = require('../../template/chat-window-message.hbs')

export default class ChatWindowMessage {
   private element;

   constructor(private message: Message, private chatWindow: ChatWindow) {
      this.generateElement();
      this.registerHooks();
   }

   public getElement() {
      return this.element;
   }

   public restoreNextMessage() {
      let nextId = this.message.getNextId();

      if (nextId) {
         let nextMessage = this.chatWindow.getTranscript().getMessage(nextId);

         if (!nextMessage) {
            console.warn('Couldnt find next message.');
            return;
         }

         if (nextMessage.getDOM().length === 0) {
            let chatWindowMessage = this.chatWindow.getChatWindowMessage(nextMessage);
            let element = chatWindowMessage.getElement();

            this.getElement().before(element);
            chatWindowMessage.restoreNextMessage();
         }
      }
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

      if (this.message.getErrorMessage()) {
         this.element.addClass('jsxc-error');
         this.element.attr('title', this.message.getErrorMessage());
      }

      if (this.message.hasAttachment()) {
         this.addAttachmentToElement();
      }

      if (this.message.getDirection() === Message.DIRECTION.SYS) {
         this.element.find('.jsxc-message-area').append('<div class="jsxc-clear"/>');
      } else {
         //@TODO update last message
         //$('[data-bid="' + bid + '"]').find('.jsxc-lastmsg .jsxc-text').html(msg);
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
      avatarElement.attr('title', title); //@REVIEW escape?

      this.element.prepend(avatarElement)
      this.element.attr('data-name', sender.name);

      if (this.element.prev().length > 0 && this.element.prev().find('.jsxc-avatar').attr('title') === avatarElement.attr('title')) {
         avatarElement.css('visibility', 'hidden');
      }

      this.element.setPlaceholder(avatarElement, sender.name);
   }

   private registerHooks() {
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
   }
}
