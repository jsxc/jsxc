import { IMessage, DIRECTION, MessageMark } from '../Message.interface';
import DateTime from './util/DateTime';
import ChatWindow from './ChatWindow';
import AvatarSet from './AvatarSet';
import Log from '../util/Log';
import LinkHandlerGeo from '@src/LinkHandlerGeo';
import Color from '@util/Color';
import Translation from '@util/Translation';
import showLogDialog from './dialogs/xep308log';

let chatWindowMessageTemplate = require('../../template/chat-window-message.hbs')
const LONGPRESS_TIME = 600; //how long is a long press in millis

export default class ChatWindowMessage {
   private element;

   // holds the start time for long press
   private longpress_start;

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
         direction: this.message.getDirectionString(),
      });

      this.element = $(template);

      let bodyElement= $ (await this.message.getProcessedBody());

      LinkHandlerGeo.get().detect(bodyElement);

      this.element.find('.jsxc-content').html(bodyElement);

      let timestampElement = this.element.find('.jsxc-timestamp');
      DateTime.stringify(this.message.getStamp().getTime(),timestampElement);

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

      if (this.message.getDirection()!==DIRECTION.SYS)
      {
         if (this.message.getReplaceId()!==null)
         {
            this.element.hide();
         }
         else {
            let replacement = this.chatWindow.getTranscript().getLatestReplaceMessageFromMessage(this.message);
            if (replacement!==null&&replacement.getAttrId()!==this.message.getAttrId())
            {
               this.replaceBody($(await replacement.getProcessedBody()));
               let newtimestampElement = $('<div class="jsxc-timestamp">');
               newtimestampElement.insertBefore(timestampElement);
               timestampElement.remove(); // to kill the timer
               DateTime.stringify(this.message.getReplaceTime(),newtimestampElement);
            }
         }
      }
   }

   private format(messages:IMessage[]) {
      let text = '';
      for (let i=0;i<messages.length;i++)
      {
         try {
         if (messages[i]!==undefined&&(<any>messages[i]).uid!==undefined)
         {
            text+=messages[i].getPlaintextMessage()+' - ('+DateTime.stringifyToString(messages[i].getStamp().getTime())+')\n\n';
         }
         }catch (e){
            console.error(messages,messages[i],i,e);
         }
      }
      return text;
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
         attachmentElement = $('<a target="_blank" rel="noopener noreferrer">').append(attachmentElement);
         attachmentElement.attr('href', attachment.getData());
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

   private registerHooks() {
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

      this.message.registerHook('replaceBody', (processBodyString) => {
         if (processBodyString) {
            this.replaceBody(processBodyString);         
            let timestampElement = this.element.find('.jsxc-timestamp');
            let newtimestampElement = $('<div class="jsxc-timestamp">');
            newtimestampElement.insertBefore(timestampElement);
            timestampElement.remove(); // to kill the timer
            DateTime.stringify(this.message.getReplaceTime(),newtimestampElement);
         }
      });

      this.message.registerHook('progress', (progress) => {
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

      this.element.off('mousedown').on( 'mousedown', ()=> {
          this.longpress_start = new Date().getTime();
      });

      this.element.off('mouseleave').on( 'mouseleave', ()=> {
          this.longpress_start = 0;
      });

      this.element.off('mouseup').on( 'mouseup', ()=> {
          if ( new Date().getTime() >= ( this.longpress_start + LONGPRESS_TIME )) {
             if (this.message.getDirection()===DIRECTION.OUT) //we can only edit outging messages
             {
                 this.chatWindow.selectEditMessage(this.message);
             }
          }
          else
          {
             //SHORT PRESS... not needed now!
          }
      });
   }

   private replaceBody(processBodyString:any) {

      let bodyElement :JQuery<HTMLElement> = $(processBodyString);
      LinkHandlerGeo.get().detect(bodyElement);

      let contentElement = this.element.find('.jsxc-content');
      contentElement.html(processBodyString);

      

      if (!this.element.find('.jsxc-replace').hasClass('jsxc-replace-icon'))
      {
            this.element.find('.jsxc-replace').addClass('jsxc-replace-icon');
            this.element.find('.jsxc-replace').on('click',()=>{
               let chain = this.chatWindow.getTranscript().getReplaceMessageChainFromMessage(this.message);
               if (chain!==null)
               {
                  showLogDialog(this.chatWindow.getContact().getAccount().getContact(),this.chatWindow.getContact(),chain);
               }
            });
      }

      let chain = this.chatWindow.getTranscript().getReplaceMessageChainFromMessage(this.message);
     
      if (chain!==null)
      {
         this.element.find('.jsxc-replace.jsxc-replace-icon').attr('title',this.format(chain));
      }
   }
}