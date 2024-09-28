import { IMessage, DIRECTION, MessageMark } from '../Message.interface';
import DateTime from './util/DateTime';
import ChatWindow from './ChatWindow';
import AvatarSet from './AvatarSet';
import Log from '../util/Log';
import LinkHandlerGeo from '@src/LinkHandlerGeo';
import Color from '@util/Color';
import Translation from '@util/Translation';
import messageHistory from './dialogs/messageHistory';
import MenuComponent from './MenuComponent';
import onLongPress from './util/LongPress';

let chatWindowMessageTemplate = require('../../template/chat-window-message.hbs');

export default class ChatWindowMessage {
   private element: JQuery<HTMLElement>;

   private message: IMessage;

   constructor(private originalMessage: IMessage, private chatWindow: ChatWindow, useLastVersion: boolean = true) {
      this.message = useLastVersion ? originalMessage.getLastVersion() : originalMessage;

      let template = chatWindowMessageTemplate({
         id: this.message.getCssId(),
         direction: this.message.getDirectionString(),
      });

      this.element = $(template);

      this.generateElement();
      this.registerHooks();

      this.initMenu();
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
      let nextId = this.originalMessage.getNextId();

      while (nextId) {
         let nextMessage = this.chatWindow.getTranscript().getMessage(nextId);

         if (!nextMessage) {
            Log.warn('Couldnt find next message.');
            return;
         }

         if (!nextMessage.isReplacement()) {
            return nextMessage;
         }

         nextId = nextMessage.getNextId();
      }
   }

   private async generateElement() {
      let bodyElement = $(await this.message.getProcessedBody());

      LinkHandlerGeo.get().detect(bodyElement);

      let html = $.map(bodyElement, function (val: any, i: number) {
         return $(val).html();
      }).join('');
      this.element.find('.jsxc-content').html(html);

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

      if (this.message.isReplacement()) {
         this.element.addClass('jsxc-edited');
      }

      this.element.find('.jsxc-version').on('click', () => {
         if (!this.element.hasClass('jsxc-edited')) {
            return;
         }

         messageHistory(this.originalMessage, this.chatWindow);
      });

      if (this.message.getErrorMessage()) {
         this.element.addClass('jsxc-error');
         this.element.find('.jsxc-error-content').text(Translation.t(this.message.getErrorMessage()));
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

      if (attachment.isImage()) {
         let imgElement = $('<img>')
            .attr('alt', 'preview')
            .attr('src', attachment.getThumbnailData() || '../images/placeholder_image.svg')
            .attr('title', attachment.getName())
            .appendTo(attachmentElement);

         if (!attachment.hasThumbnailData()) {
            attachmentElement.addClass('jsxc-no-thumbnail');
         }

         attachment.registerThumbnailHook(thumbnail => {
            imgElement.attr('src', thumbnail || '../images/placeholder_image.svg');

            if (thumbnail) {
               this.element.find('.jsxc-attachment').removeClass('jsxc-no-thumbnail');
            } else {
               this.element.find('.jsxc-attachment').addClass('jsxc-no-thumbnail');
            }
         });
      } else {
         attachmentElement.text(attachment.getName());

         attachmentElement.removeClass('jsxc-' + mimeType.replace(/\//, '-'));
      }

      if (attachment.hasData()) {
         attachmentElement = $('<a target="_blank" class="jsxc-image-download" rel="noopener noreferrer">').append(
            attachmentElement
         );
         attachmentElement.attr('href', attachment.getData());

         if (!attachment.isImage() || !attachment.getData().startsWith('http'))
            attachmentElement.attr('download', attachment.getName());

         if (attachment.getHandler()) {
            attachmentElement.on('click', ev => {
               ev.preventDefault();

               attachmentElement.find('.jsxc-attachment').addClass('jsxc-attachment--loading');

               attachment
                  .getHandler()
                  .call(undefined, attachment, true)
                  .catch(err => {
                     this.message.setErrorMessage(err.toString());
                  })
                  .then(() => {
                     attachmentElement.find('.jsxc-attachment').removeClass('jsxc-attachment--loading');
                  });
            });
         }

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

   private initMenu() {
      if (this.message.isSystem()) {
         return;
      }

      const messageMenu = this.chatWindow.getAccount().getChatMessageMenu();
      const menuType = this.message.isOutgoing() ? 'vertical-right' : 'vertical-left';
      const menu = new MenuComponent('more', menuType, messageMenu, [this.chatWindow.getContact(), this.message]);

      this.element.append(menu.getElement());

      onLongPress(this.element, () => {
         menu.toggle();
      });
   }

   private registerHooks() {
      this.message.registerHook('replacedBy', () => {
         const chatWindowMessageReplacement = new ChatWindowMessage(this.originalMessage, this.chatWindow);

         this.element.replaceWith(chatWindowMessageReplacement.getElement());
      });

      this.message.registerHook('encrypted', encrypted => {
         if (encrypted) {
            this.element.addClass('jsxc-encrypted');
         } else {
            this.element.removeClass('jsxc-encrypted');
         }
      });

      this.message.registerHook('unread', unread => {
         if (!unread) {
            this.element.removeClass('jsxc-unread');
         }
      });

      this.message.registerHook('progress', progress => {
         this.element.find('.jsxc-attachment').attr('data-progress', Math.round(progress * 100) + '%');
      });

      if (this.message.getDirection() === DIRECTION.OUT || this.message.getDirection() === DIRECTION.PROBABLY_OUT) {
         this.message.registerHook('mark', mark => {
            this.element.attr('data-mark', MessageMark[mark]);
         });
      }

      this.message.registerHook('next', nextId => {
         if (nextId) {
            this.restoreNextMessage();
         }
      });

      this.message.registerHook('errorMessage', errorMessage => {
         if (errorMessage) {
            this.element.addClass('jsxc-error');
            this.element.find('.jsxc-error-content').text(Translation.t(errorMessage));
         } else {
            this.element.removeClass('jsxc-error');
            this.element.find('.jsxc-error-content').empty();
         }
      });
   }
}
