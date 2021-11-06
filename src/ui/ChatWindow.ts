import Log from '../util/Log';
import Contact from '../Contact';
import Menu from './util/Menu';
import Message from '../Message';
import { DIRECTION, IMessage } from '../Message.interface';
import Client from '../Client';
import Account from '../Account';
import Emoticons from '../Emoticons';
import AvatarSet from './AvatarSet';
import { startCall } from './actions/call';
import { Presence } from '../connection/AbstractConnection';
import { EncryptionState } from '../plugin/AbstractPlugin';
import ElementHandler from './util/ElementHandler';
import ChatWindowMessage from './ChatWindowMessage';
import Transcript from '../Transcript';
import FileTransferHandler from './ChatWindowFileTransferHandler';
import Attachment from '../Attachment';
import { IJID } from '@src/JID.interface';
import { JINGLE_FEATURES } from '@src/JingleAbstractSession';
import Location from '@util/Location';
import interact from 'interactjs';
import Translation from '../util/Translation';
import MultiUserContact from '@src/MultiUserContact';
import UUID from '@util/UUID';

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;
const BACKSPACE_KEY = 8;
const DELETE_KEY = 46;
const UP_KEY = 38;

export enum State {
   Open,
   Minimized,
   Closed,
}

export default class ChatWindow {
   protected element: JQuery<HTMLElement>;

   private inputElement: JQuery<HTMLElement>;

   private inputBlurTimeout: number;

   private readTimeout: number;

   private readonly INPUT_RESIZE_DELAY = 1200;

   private readonly HIGHTLIGHT_DURATION = 600;

   private readonly READ_DELAY = 2000;

   private chatWindowMessages: { [id: string]: ChatWindowMessage } = {};

   private attachmentDeposition: Attachment;

   private settingsMenu: Menu;

   private encryptionMenu: Menu;

   private editMessage: IMessage;

   constructor(protected contact: Contact) {
      let template = chatWindowTemplate({
         accountUid: this.getAccount().getUid(),
         contactId: contact.getId(),
         contactJid: contact.getJid().bare,
         name: contact.getName(),
      });
      this.element = $(template);
      this.inputElement = this.element.find('.jsxc-message-input');

      Menu.init(this.element.find('.jsxc-menu'));
      this.settingsMenu = this.element.find('.jsxc-menu-settings').data('object');
      this.encryptionMenu = this.element.find('.jsxc-menu.jsxc-transfer').data('object');

      this.initResizableWindow();
      this.initEmoticonMenu();
      this.restoreLocalHistory();
      this.registerHandler();
      this.registerInputHandler();
      this.initDroppable();

      new FileTransferHandler(this);

      this.element.find('.jsxc-window').css('bottom', -1 * this.element.find('.jsxc-window-fade').height());

      let avatar = AvatarSet.get(contact);
      avatar.addElement(this.element.find('.jsxc-bar--window .jsxc-avatar'));

      this.initEncryptionIcon();
      this.registerHooks();

      this.element.attr('data-presence', Presence[this.contact.getPresence()]);
      this.element.attr('data-subscription', this.contact.getSubscription());
      this.element.attr('data-type', this.contact.getType());

      if (this.contact.isGroupChat()) {
         if (this.element.attr('data-presence')==='offline')
         {
            (<MultiUserContact>this.contact).setNickname(this.getContact().getAccount().getJID().node);
            (<MultiUserContact>this.contact).join();
         }

         const setMembersOnly = () =>
            this.element.attr('data-membersonly', (this.contact as MultiUserContact).isMembersOnly().toString());
         const setNonAnonymous = () =>
            this.element.attr('data-nonanonymous', (this.contact as MultiUserContact).isNonAnonymous().toString());

         this.contact.registerHook('features', () => {
            setMembersOnly();
            setNonAnonymous();
         });

         setMembersOnly();
         setNonAnonymous();
      }

      this.getAccount().triggerChatWindowInitializedHook(this, contact);
      this.element.on('contextmenu', '.jsxc-in, .jsxc-probably_in, .jsxc-out, .jsxc-probably_out', {ref:this},this.openContextMenu);

      this.element.on('mousedown click', (ev) => {
          if (!($(ev.target).parents('.jsxc-custom-menu').length > 0)) {
            $('.jsxc-custom-menu').hide(250);
          }
      });

      let messageAreaElement = this.element.find('.jsxc-message-area');
      let anchorElement = this.element.find('.jsxc-message-area-anchor');
      messageAreaElement.on('scroll', function () {
         if (messageAreaElement.text().trim().length>0)
         {
            let scrollHeight: number   = messageAreaElement[0].scrollHeight;
            let clientHeight : number  = messageAreaElement[0].clientHeight;
            let scrollTop : number     = messageAreaElement[0].scrollTop;
            if (scrollTop<0)
               scrollTop=scrollTop*(-1);

            if (!(clientHeight + 42 < scrollHeight - scrollTop))
            {
               anchorElement.hide(400);
            }
            else
            if (scrollTop>50)
            {
               anchorElement.show(400);
            }
            else
            {
               anchorElement.hide(400);
            }
         }
         else {
            anchorElement.hide(400);
         }
      });

      anchorElement.on('click',()=>{
         this.scrollMessageAreaToBottom();
      });

      let updateUnreadMessage = () => {
         let unreadMessages = this.contact.getTranscript().getNumberOfUnreadMessages();
         
         if (unreadMessages > 0 && this.element.hasClass("jsxc-minimized")) {
            this.element.find('.jsxc-bar--window.jsxc-bar').addClass('jsxc-blink-unread-msg');
         } else {
            this.element.find('.jsxc-bar--window.jsxc-bar').removeClass('jsxc-blink-unread-msg');
         }
      };

      this.contact.getTranscript().registerHook('unreadMessageIds', updateUnreadMessage);
      updateUnreadMessage();
   }

   public openContextMenu(event)
   {
        let element = event.data.ref.element;
        event.preventDefault();

        // Show contextmenu
        let xoffset = event.currentTarget.offsetLeft+event.offsetX;
        let yoffset =  (event.pageY-$(event.target).closest('div.jsxc-message-area').offset().top);

        let contact = null;
        let _self : ChatWindow = event.data.ref;
        let refmessage = $(event.target).closest('div.jsxc-chatmessage').attr('id');
        let msg : IMessage = _self.getTranscript().getMessage(refmessage);
        if (msg.isRetracted())
        {
           return;
        }

        if (!$(event.currentTarget).hasClass('jsxc-out'))
        {
           contact = $(event.target).closest('div.jsxc-chatmessage').attr('data-name');
           if (!contact) {
              contact = $(event.target).closest('li.jsxc-window-item').attr('data-contact-id');
           }
        }

        if ($(event.target).closest('div.jsxc-chatmessage').hasClass('jsxc-in')||$(event.target).closest('div.jsxc-chatmessage').hasClass('jsxc-probably_in'))
        {
            element.find('.jsxc-custom-menu').finish().toggle().
            // In the right position (the mouse)
            css({
               top: yoffset + 'px',
               left: xoffset  + 'px',
               right: 'unset'
            });
        }
        else
        {
            element.find('.jsxc-custom-menu').finish().toggle().
            // In the right position (the mouse)
            css({
               top:yoffset + 'px',
               right: event.currentTarget.offsetWidth-event.offsetX-10 + 'px',
               left: 'unset'
            });
        }

        element.find('.jsxc-custom-menu').empty();
        element.find('.jsxc-custom-menu').append('<div class="jsxc-context-menu-contact">'+(contact!==null?contact:Translation.t('Myself'))+'</div>');

        let liQuote = $('<li data-action="jsxc-context-menu-quote" data-refmessage="'+refmessage+'">'+Translation.t('Quote')+'</li>');
        element.find('.jsxc-custom-menu').append(liQuote);

        liQuote.on('click',{ref:event.data.ref},function(e)
        {
            $('.jsxc-custom-menu').hide(250);
            let refmessage = $(e.target).attr('data-refmessage');
            let msg : IMessage = _self.getTranscript().getMessage(refmessage);
            _self.selectMessageForQuote(msg,contact);
        });

        if ((msg.getDirection()===DIRECTION.OUT||msg.getDirection()===DIRECTION.PROBABLY_OUT)&&!_self.getTranscript().getMessage(refmessage).isRetracted())
        {
            let firstMessage = _self.getTranscript().getLatestOutgoingMessageForEdit();

            if (firstMessage.getAttrId()===msg.getAttrId()||Client.getOption("allowAllMessagesCorrection")|| false)
            {
               let liEdit = $('<li data-action="jsxc-context-menu-quote" data-refmessage="'+refmessage+'">'+Translation.t('Edit')+'</li>');        
               element.find('.jsxc-custom-menu').append(liEdit);
               liEdit.on('click',{ref:event.data.ref},function(e)
               {
                  $('.jsxc-custom-menu').hide(250);
                  let refmessage = $(e.target).attr('data-refmessage');
                  let msg : IMessage = _self.getTranscript().getMessage(refmessage);

                  _self.selectEditMessage(msg);
               });
            }

            let liRemove = $('<li data-action="jsxc-context-menu-quote" data-refmessage="'+refmessage+'">'+Translation.t('Remove')+'</li>');        
            element.find('.jsxc-custom-menu').append(liRemove);
            liRemove.on('click',{ref:event.data.ref},function(e)
            {
               $('.jsxc-custom-menu').hide(250);
               let refmessage = $(e.target).attr('data-refmessage');
               let msg : IMessage = _self.getTranscript().getMessage(refmessage);

               _self.selectMessageForRetract(msg);
            });
        }
   }

   private selectMessageForRetract(msg: IMessage)
   {
      let message = new Message({
         peer: this.contact.getJid(),
         direction: Message.DIRECTION.OUT,
         type: this.contact.getType(),
         plaintextMessage: Translation.t('RETRACTION_BODY'),
         unread: false,
      });
      msg.setPlaintextMessage(Translation.t('RETRACTION_BODY'));
      msg.setRetracted(true);
      message.setRetracted(false);
      message.setRetractId(msg.getAttrId());
      this.getTranscript().pushMessage(message);

      let pipe = this.getAccount().getPipe('preSendMessage');

      pipe.run(this.contact, message).then(([contact, message]) => {
         this.getAccount().getConnection().sendRetractMessage(<Message>message);
         this.editMessage=null;

      }).catch(err => {
         Log.warn('Error during preSendMessage pipe', err);
         this.editMessage=null;
      });
      this.clearAttachment();
   }

   private selectMessageForQuote(msg:IMessage,contact:string){
      let message = msg.getPlaintextMessage();
      let msgarr = message.split('\n');
      if (msgarr.join('').trim().length===0)
      {
         message = msg.getAttachment().getData();
      }
      else
         message = msgarr.join('\n> ');

      if (contact===null)
      {
         if (this.contact.isGroupChat())
         {
            contact = (<MultiUserContact>this.getContact()).getNickname();
         }
         else
         {
            contact =  this.getAccount().getContact().getJid().bare;
         }
      }

      setTimeout(() => this.scrollMessageAreaToBottom(), 500);

      this.inputElement.val('> '+contact+':\n> '+message+'\n');
      this.inputElement.focus();
      this.resizeInputArea();
   }

   public selectEditMessage(message: IMessage)
   {
      let chain = this.getTranscript().getReplaceMessageChainFromMessage(message);
      this.editMessage=message.getReplaceId()!==null?this.getTranscript().findMessageByAttrId(message.getReplaceId()):message;

      this.inputElement.val('> '+chain[chain.length-1].getPlaintextMessage());
      this.inputElement.focus();
      this.resizeInputArea()
   }

   public getTranscript(): Transcript {
      return this.contact.getTranscript();
   }

   public getChatWindowMessage(message: IMessage) {
      let id = message.getUid();

      if (!this.chatWindowMessages[id]) {
         this.chatWindowMessages[id] = new ChatWindowMessage(message, this);
      }

      return this.chatWindowMessages[id];
   }

   public getId() {
      return this.contact.getId();
   }

   public getAccount(): Account {
      return this.contact.getAccount();
   }

   public getContact(jid?: IJID) {
      return jid ? this.getAccount().getContact(jid) : this.contact;
   }

   public getDom() {
      return this.element;
   }

   public close() {
      this.element.detach();
      this.element.off('mousedown click');
   }

   public minimize() {
      this.element.removeClass('jsxc-normal').addClass('jsxc-minimized');
   }

   public open() {
      this.element.removeClass('jsxc-minimized').addClass('jsxc-normal');

      this.scrollMessageAreaToBottom();
   }

   public focus() {
      this.element.find('.jsxc-message-input').focus();
   }

   public clear() {
      this.chatWindowMessages = {};

      this.getTranscript().clear();

      this.element.find('.jsxc-message-area').empty();

      this.getAccount().triggerChatWindowClearedHook(this, this.contact);
   }

   public highlight() {
      let element = this.element;

      if (!element.hasClass('jsxc-highlight')) {
         element.addClass('jsxc-highlight');

         setTimeout(function () {
            element.removeClass('jsxc-highlight');
         }, this.HIGHTLIGHT_DURATION);
      }
   }

   public setBarText(text: string) {
      this.element.find('.jsxc-bar__caption__secondary').text(text);
   }

   public appendTextToInput(text: string = '') {
      let value = this.inputElement.val();

      this.inputElement.val((value + ' ' + text).trim());
      this.inputElement.focus();
   }

   public postMessage(message: IMessage): ChatWindowMessage {
      if (message.getDirection() === Message.DIRECTION.IN && this.inputElement.is(':focus') && Client.isVisible()) {
         message.read();
      }

      let chatWindowMessage = this.getChatWindowMessage(message);
      let messageElement = chatWindowMessage.getElement();

      if (message.getDOM().length > 0) {
         message.getDOM().replaceWith(messageElement);
      } else {
         if (message.getDirection()===DIRECTION.IN||message.getDirection()===DIRECTION.PROBABLY_IN)
         {
            let oldout=this.element.find('div[id="'+message.getAttrId()+'"]');
            if (oldout.length>0)
            {
               oldout.hide();  // hide old outgoing message if > 1 client with same bare jid have same nickname
               messageElement.removeClass('jsxc-in').addClass('jsxc-out');
            }
         }

         this.element.find('.jsxc-message-area').prepend(messageElement);
      }

      if (message.getDirection()===DIRECTION.SYS)
      {
         let disableJoinLeaveMessages = Client.getOption('disableJoinLeaveMessages') || false;
         if (disableJoinLeaveMessages)
         {

            if (
               message.getPlaintextMessage().indexOf(Translation.t('entered_the_room', {
                  nickname: '',
                  escapeInterpolation: true,
               }))>-1||
               message.getPlaintextMessage().indexOf(Translation.t('left_the_building', {
                  nickname: '',
                  escapeInterpolation: true,
               }))>-1||
               message.getPlaintextMessage().indexOf(Translation.t('You_left_the_building'))>-1
               )
            {
               messageElement.hide();
            }
         }
      }

      chatWindowMessage.restoreNextMessage();

      setTimeout(() => this.scrollMessageAreaToBottom(), 500);

      return chatWindowMessage;
   }

   public addActionEntry(className: string, cb: (ev) => void, child?: JQuery<HTMLElement>) {
      let element = $('<div>');
      element.addClass('jsxc-bar__action-entry');
      element.addClass(className);
      element.on('click', cb);

      if (child) {
         element.append(child);
      }

      this.element.find('.jsxc-bar__action-entry.jsxc-js-close').before(element);
   }

   public addMenuEntry(className: string, label: string, cb: (ev) => void) {
      return this.settingsMenu.addEntry(label, cb, className);
   }

   public setAttachment(attachment: Attachment) {
      this.attachmentDeposition = attachment;

      let previewElement = this.element.find('.jsxc-preview');
      previewElement.empty();
      previewElement.append('<p class="jsxc-waiting">Processing...</p>');
      previewElement.empty().append(attachment.getElement());

      let deleteElement = $('<div>');
      deleteElement.text('×');
      deleteElement.addClass('jsxc-delete-handle');
      deleteElement.click(() => {
         this.clearAttachment();
      });
      previewElement.children().first().append(deleteElement);

      this.scrollMessageAreaToBottom();
   }

   public clearAttachment() {
      this.attachmentDeposition = undefined;

      let previewElement = this.element.find('.jsxc-preview');
      previewElement.empty();
   }

   public getOverlay(): JQuery<HTMLElement> {
      return this.getDom().find('.jsxc-window__overlay__content');
   }

   public showOverlay() {
      this.getDom().find('.jsxc-window__overlay').addClass('jsxc-window__overlay--show');
   }

   public hideOverlay() {
      this.getDom().find('.jsxc-window__overlay__content').empty();
      this.getDom().find('.jsxc-window__overlay').removeClass('jsxc-window__overlay--show');
   }

   protected initDroppable() {
      let enterCounter = 0;
      let windowElement = this.element.find('.jsxc-window');

      windowElement.addClass('jsxc-droppable');

      windowElement.on('dragenter', ev => {
         enterCounter++;

         windowElement.addClass('jsxc-dragover');
      });

      windowElement.on('dragleave', ev => {
         enterCounter--;

         if (enterCounter === 0) {
            windowElement.removeClass('jsxc-dragover');
         }
      });

      windowElement.on('dragover', ev => {
         ev.preventDefault();

         (<any>ev.originalEvent).dataTransfer.dropEffect = 'copy';
      });
   }

   private getController() {
      return this.contact.getChatWindowController();
   }

   private registerHandler() {
      let self = this;
      let contact = this.contact;
      let elementHandler = new ElementHandler(contact);

      elementHandler.add(this.element.find('.jsxc-fingerprints')[0], function () {
         // showFingerprintsDialog(contact);
      });

      elementHandler.add(this.element.find('.jsxc-bar--window')[0], () => {
         this.toggle();
      });

      elementHandler.add(this.element.find('.jsxc-js-close')[0], ev => {
         ev.stopPropagation();

         this.getController().close();
      });

      elementHandler.add(this.element.find('.jsxc-clear')[0], () => {
         this.clear();
      });

      if (this.contact.isChat()) {
         elementHandler.add(
            this.element.find('.jsxc-video')[0],
            ev => {
               ev.stopPropagation();

               startCall(contact, this.getAccount());
            },
            JINGLE_FEATURES.video
         );

         elementHandler.add(
            this.element.find('.jsxc-audio')[0],
            ev => {
               ev.stopPropagation();

               startCall(contact, this.getAccount(), 'audio');
            },
            JINGLE_FEATURES.audio
         );

         elementHandler.add(
            this.element.find('.jsxc-share-screen')[0],
            ev => {
               ev.stopPropagation();

               startCall(contact, this.getAccount(), 'screen');
            },
            JINGLE_FEATURES.screen
         );
      }

      elementHandler.add(this.element.find('.jsxc-send-location')[0], ev => {
         Location.getCurrentLocationAsGeoUri()
            .then(uri => {
               this.sendOutgoingMessage(uri);
            })
            .catch(err => {
               Log.warn('Could not get current location', err);

               this.getContact().addSystemMessage('Could not get your current location.');
            });
      });

      elementHandler.add(this.element.find('.jsxc-message-area')[0], function () {
         // check if user clicks element or selects text
         if (typeof getSelection === 'function' && !getSelection().toString()) {
            self.inputElement.focus();
         }
      });

      this.element.find('.jsxc-messagesearch-input').on('keyup',this.searchMessage);
      elementHandler.add(this.element.find('.jsxc-message-search-off')[0], ev => {
         this.clearSearch(ev);
      });
   }

   private clearSearch(ev) : void {
      ev.stopPropagation();
      this.element.find('.jsxc-message-search').removeClass('jsxc-hidden');
      this.element.find('.jsxc-message-search-off').addClass('jsxc-hidden');
      this.element.find('.jsxc-search-negativeresult').removeClass('jsxc-search-negativeresult');
      this.element.find('.jsxc-search-positiveresult').each(function(){
         $(this).parent().text($(this).parent().text());
      });
   }

   private searchMessage = ev => {
      ev.stopPropagation();

      if (ev.which === ENTER_KEY && !ev.shiftKey
         && $(ev.target).val()!==undefined
         && $(ev.target).val().toString().trim()!==''
         && $(ev.target).val().toString().trim().length>=3 ) {
         let messages = this.element.find(".jsxc-chatmessage");
         for (let message of messages) {
                    
            if ($(message).text().indexOf($(ev.target).val().toString())===-1)
            {
               $(message).addClass('jsxc-search-negativeresult');
            }   
            else 
            {
               if ($(message).find('.jsxc-content').find('.jsxc-attachment.jsxc-text').length>0)
               {
                  let text = $(message).find('.jsxc-content').find('.jsxc-attachment.jsxc-text').text();
                  text = text.replace($(ev.target).val().toString(),'<span class="jsxc-search-positiveresult">'+$(ev.target).val().toString()+'</span>');
                  $(message).find('.jsxc-content').find('.jsxc-attachment.jsxc-text').html(text);
               }
               if ($(message).find('.jsxc-content').find('p').text().indexOf($(ev.target).val().toString())>=0)
               {
                  let text = $(message).find('.jsxc-content').find('p').text();
                  text = text.replace($(ev.target).val().toString(),'<span class="jsxc-search-positiveresult">'+$(ev.target).val().toString()+'</span>');
                  $(message).find('.jsxc-content').find('p').html(text);
               }
            }   
         }

         this.element.find('.jsxc-message-search').addClass('jsxc-hidden');
         this.element.find('.jsxc-message-search-off').removeClass('jsxc-hidden');
      }
   };

   private registerInputHandler() {
      let self = this;
      let inputElement = this.inputElement;

      inputElement.keyup(self.onInputKeyUp);
      inputElement.keypress(self.onInputKeyPress);
      inputElement.focus(this.onInputFocus);
      inputElement.blur(this.onInputBlur);

      inputElement
         .mouseenter(function () {
            $('#jsxc-window-list').data('isHover', true);
         })
         .mouseleave(function () {
            $('#jsxc-window-list').data('isHover', false);
         });
   }

   private onInputKeyUp = ev => {
      ev.stopPropagation();
      // let message = <string> $(ev.target).val();

      if ((ev.which === BACKSPACE_KEY || ev.which === DELETE_KEY) && (this.inputElement.val()==='' || this.inputElement.val()==='>'))
      {
          this.editMessage=null;
          this.inputElement.val('');
      }

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         // message = '';
      } else {
         this.resizeInputArea();
      }

      if (ev.which === ESC_KEY) {
         this.editMessage=null;
         this.getController().close();
      }

      if (ev.which === UP_KEY && (this.inputElement.val()===null||this.inputElement.val().toString().trim().length===0)) {
         let firstMessage = this.getTranscript().getLatestOutgoingMessageForEdit();
         this.selectEditMessage(firstMessage);
      }

      let selectionStart = ev.target.selectionStart;
      let selectionEnd = ev.target.selectionEnd;

      if (selectionStart === selectionEnd) {
         // let lastSpaceIndex = message.lastIndexOf(' ') + 1;
         // let lastNewlineIndex = message.lastIndexOf('\n') + 1;
         // let lastWord = message.slice(Math.max(lastSpaceIndex, lastNewlineIndex), selectionStart);
         //@TODO auto complete
      }
   };

   private onInputKeyPress = ev => {
      ev.stopPropagation();

      let message: string = <string>$(ev.target).val();

      if (ev.which !== ENTER_KEY || ev.shiftKey || (!message && !this.attachmentDeposition)) {
         return;
      }

      this.getAccount()
         .getCommandRepository()
         .execute(message, this.contact)
         .then(result => {
            if (result === false) {
               this.sendOutgoingMessage(message);
            }
         })
         .catch(err => {
            this.contact.addSystemMessage(err.message || Translation.t('Command_failed'));
         });

      $(ev.target).val('');

      this.resizeInputArea();

      ev.preventDefault();
   };

   private onInputFocus = () => {
      if (this.inputBlurTimeout) {
         clearTimeout(this.inputBlurTimeout);
      }

      this.readTimeout = window.setTimeout(() => {
         this.getTranscript().markAllMessagesAsRead();
      }, this.READ_DELAY);

      this.resizeInputArea();
   };

   private onInputBlur = ev => {
      if (this.readTimeout) {
         clearTimeout(this.readTimeout);
      }

      this.inputBlurTimeout = window.setTimeout(function () {
         $(ev.target).css('height', '');
      }, this.INPUT_RESIZE_DELAY);
   };

   private sendOutgoingMessage(messageString: string) {
      let plainTextMessage = this.editMessage!=null?messageString.substring(1).trim():messageString;
      let message = new Message({
         peer: this.contact.getJid(),
         direction: Message.DIRECTION.OUT,
         type: this.contact.getType(),
         plaintextMessage: plainTextMessage,
         attachment: this.attachmentDeposition,
         unread: false,
      });

      message.setReplaceId(this.editMessage!=null?this.editMessage.getAttrId():null);

      if (this.attachmentDeposition!==undefined||(plainTextMessage!==null&&plainTextMessage!==undefined&&plainTextMessage.trim().length>0))
      {
         this.getTranscript().pushMessage(message);

         let pipe = this.getAccount().getPipe('preSendMessage');

         pipe.run(this.contact, message).then(([contact, message]) => {
            this.getAccount().getConnection().sendMessage(message);
            this.editMessage=null;
         }).catch(err => {
            Log.warn('Error during preSendMessage pipe', err);
            this.editMessage=null;
         });
      }

      this.clearAttachment();

      if (messageString === '?' && Client.getOption('theAnswerToAnything') !== false) {
         if (typeof Client.getOption('theAnswerToAnything') === 'undefined' || (Math.random() * 100) % 42 < 1) {
            Client.setOption('theAnswerToAnything', true);

            this.getContact().addSystemMessage('42');
         }
      }
   }

   private toggle = (ev?) => {
      if (this.element.hasClass('jsxc-minimized')) {
         this.getController().open();
      } else {
         this.getController().minimize();
      }
   };

   private updateEncryptionState = encryptionState => {
      Log.debug('update window encryption state to ' + EncryptionState[encryptionState]);

      let transferElement = this.encryptionMenu.getElement();

      transferElement.removeClass('jsxc-fin jsxc-enc jsxc-trust');

      switch (encryptionState) {
         case EncryptionState.Plaintext:
            break;
         case EncryptionState.UnverifiedEncrypted:
            transferElement.addClass('jsxc-enc');
            break;
         case EncryptionState.VerifiedEncrypted:
            transferElement.addClass('jsxc-enc jsxc-trust');
            break;
         case EncryptionState.Ended:
            transferElement.addClass('jsxc-fin');
            break;
         default:
            Log.warn('Unknown encryption state');
      }
   };

   private resizeInputArea() {
      let inputElement = this.inputElement;

      if (!inputElement.data('originalScrollHeight')) {
         inputElement.data('originalScrollHeight', inputElement[0].scrollHeight);
      }

      if (inputElement.val()) {
         inputElement.parent().addClass('jsxc-contains-val');
      } else {
         inputElement.parent().removeClass('jsxc-contains-val');
      }

      this.element.removeClass('jsxc-large-send-area');

      if (inputElement.data('originalScrollHeight') < inputElement[0].scrollHeight && inputElement.val()) {
         this.element.addClass('jsxc-large-send-area');
      }
   }

   private initResizableWindow() {
      let element = this.element;
      let fadeElement = element.find('.jsxc-window-fade');

      interact(fadeElement.get(0))
         .resizable({
            edges: {
               top: true,
               left: true,
               bottom: false,
               right: false,
            },
         })
         .on('resizestart', () => {
            fadeElement.addClass('jsxc-window-fade--resizing');
         })
         .on('resizemove', ev => {
            let barHeight = element.find('.jsxc-bar--window').height();
            let windowHeight = $(window).height();

            let newHeight = Math.min(windowHeight - barHeight, ev.rect.height);

            fadeElement.css({
               width: ev.rect.width + 'px',
               height: newHeight + 'px',
            });

            element.find('.jsxc-bar--window').css('width', fadeElement.width() + 'px');
         })
         .on('resizeend', () => {
            fadeElement.removeClass('jsxc-window-fade--resizing');
         });

      $(window).on('resize', () => {
         let keepWindowSizeOnResize = Client.getOption('keepWindowSizeOnResize') || false;
         if (!keepWindowSizeOnResize)
         {
            fadeElement.css({
               width: '',
               height: '',
            });

            element.find('.jsxc-bar--window').css('width', '');
         }
      });
   }

   private initEmoticonMenu() {
      let emoticonListElement = this.element.find('.jsxc-menu--emoticons ul');
      let emoticonList = Emoticons.getDefaultEmoticonList();

      let findInList = function (list:string[], filter:string):boolean{         
         for (let item of list)
         {
            if (item.startsWith(filter))
            {
               return true;
            }
         }
         return false;
      };

      var addSmileys = (emoticonList, emoticonListElement, filterElement) => {
         emoticonListElement.empty();
         let filter = filterElement.val()!==null?filterElement.val().toString():null;
         let ids = new Array();;
         for (let type in emoticonList)
         {
            for (let smiley of emoticonList[type])
            {
               if (filter===null||filter===''||findInList(smiley.keywords,filter))
               {
                  let li = $('<li>');
                  emoticonListElement.append(li);
                  li.append(smiley.emoji);
                  li.attr('title', smiley.keywords[0]);
                  let id = UUID.v4();
                  ids.push(id);
                  li.attr('id', id);
                  $(emoticonListElement).on('click','li[id="'+id+'"]',(ev) => {
                     for (let strid in ids)
                     {
                        $(document).off('click','li[id="'+strid+'"]');
                     }
                     let inputElement = this.element.find('.jsxc-message-input');
                     let inputValue = <string>inputElement.val() || '';
                     let selectionStart = (<HTMLInputElement>inputElement[0]).selectionStart;
                     let selectionEnd = (<HTMLInputElement>inputElement[0]).selectionEnd;
                     let inputStart = inputValue.slice(0, selectionStart);
                     let inputEnd = inputValue.slice(selectionEnd);

                     let newValue = inputStart;
                     newValue += inputStart.length && inputStart.slice(-1) !== ' ' ? ' ' : '';
                     newValue += li.text();
                     newValue += inputEnd.length && inputEnd.slice(0, 1) !== ' ' ? ' ' : '';
                     newValue += inputEnd;

                     inputElement.val(newValue);
                     inputElement.focus();
                     filterElement.val(null);
                     addSmileys(emoticonList,emoticonListElement,jsxcemoticonsearch);
                  });
               }
            }
         }
      };

      let jsxcemoticonsearch = this.element.find('.jsxc-emoticon-search');
      addSmileys(emoticonList,emoticonListElement,jsxcemoticonsearch);
      jsxcemoticonsearch.on("keyup",(ev:any)=>{
         var code = ev.keyCode || ev.which;
         if (code===undefined)
         {
            jsxcemoticonsearch.val(null);
            addSmileys(emoticonList,emoticonListElement,jsxcemoticonsearch);
            return;
         }
         else {
            var charTyped = String.fromCharCode(code);
            if (/[a-zA-Z0-9]/g.test(charTyped)||code==8) {
               addSmileys(emoticonList,emoticonListElement,jsxcemoticonsearch);
            }
         }
      });
   }

   private restoreLocalHistory() {
      let firstMessage = this.getTranscript().getFirstMessage();

      if (!firstMessage) {
         return;
      }

      let chatWindowMessage = this.getChatWindowMessage(firstMessage);

      this.element.find('.jsxc-message-area').append(chatWindowMessage.getElement());

      chatWindowMessage.restoreNextMessage();
   }

   private scrollMessageAreaToBottom() {
      let messageArea = this.element.find('.jsxc-message-area');

      messageArea[0].scrollTop = messageArea[0].scrollHeight;
      this.element.find('.jsxc-message-area-anchor').hide(400);
   }

   private registerHooks() {
      this.contact.registerHook('encryptionState', this.updateEncryptionState);

      this.contact.registerHook('presence', newPresence => {
         this.element.attr('data-presence', Presence[newPresence]);
      });

      this.contact.registerHook('subscription', () => {
         this.element.attr('data-subscription', this.contact.getSubscription());
      });

      this.contact.registerHook('name', newName => {
         this.element.find('.jsxc-bar__caption__primary').text(newName);
      });

      this.getTranscript().registerHook('firstMessageId', firstMessageId => {
         if (!firstMessageId) {
            return;
         }

         let message = this.getTranscript().getMessage(firstMessageId);

         this.postMessage(message);
      });
   }

   private initEncryptionIcon() {
      this.updateEncryptionState(this.contact.getEncryptionState());

      let pluginRepository = this.getAccount().getPluginRepository();
      if (!pluginRepository.hasEncryptionPlugin()) {
         return;
      }

      let encryptionPlugins = pluginRepository.getAllEncryptionPlugins();

      this.encryptionMenu.getButtonElement().on('click', ev => {
         if (!this.contact.isEncrypted()) {
            return;
         }

         let encryptionPluginName = this.contact.getEncryptionPluginId();

         pluginRepository.getEncryptionPlugin(encryptionPluginName).toggleTransfer(this.contact);

         ev.preventDefault();
         ev.stopPropagation();

         return false;
      });

      let menu = this.encryptionMenu;

      for (let plugin of encryptionPlugins) {
         let label = (<any>plugin.constructor).getName().toUpperCase();

         menu.addEntry(label, () => {
            let buttonElement = this.encryptionMenu.getButtonElement();
            buttonElement.addClass('jsxc-transfer--loading');

            plugin
               .toggleTransfer(this.contact)
               .catch(err => {
                  Log.warn('Toggle transfer error:', err);

                  this.getContact().addSystemMessage(err.toString());
               })
               .then(() => {
                  buttonElement.removeClass('jsxc-transfer--loading');
               });
         });
      }

      let menuElement = this.encryptionMenu.getElement();

      if (menuElement.find('li').length > 0) {
         menuElement.removeClass('jsxc-disabled');
      }
   }
}
