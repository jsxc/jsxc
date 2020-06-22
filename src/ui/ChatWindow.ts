import Log from '../util/Log'
import Contact from '../Contact'
import Menu from './util/Menu'
import Message from '../Message'
import { IMessage } from '../Message.interface'
import Client from '../Client'
import Account from '../Account'
import Emoticons from '../Emoticons'
import AvatarSet from './AvatarSet'
import { startCall } from './actions/call'
import { Presence } from '../connection/AbstractConnection'
import { EncryptionState } from '../plugin/AbstractPlugin'
import ElementHandler from './util/ElementHandler'
import ChatWindowMessage from './ChatWindowMessage'
import Transcript from '../Transcript'
import FileTransferHandler from './ChatWindowFileTransferHandler'
import Attachment from '../Attachment'
import { IJID } from '@src/JID.interface';
import { JINGLE_FEATURES } from '@src/JingleAbstractSession';
import Location from '@util/Location';
import interact from 'interactjs';

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;

export enum State { Open, Minimized, Closed };

export default class ChatWindow {
   protected element: JQuery<HTMLElement>;

   private inputElement: JQuery<HTMLElement>;

   private inputBlurTimeout: number;

   private readTimeout: number;

   private readonly INPUT_RESIZE_DELAY = 1200;

   private readonly HIGHTLIGHT_DURATION = 600;

   private readonly READ_DELAY = 2000;

   private chatWindowMessages: {[id: string]: ChatWindowMessage} = {};

   private attachmentDeposition: Attachment;

   private settingsMenu: Menu;

   private encryptionMenu: Menu;

   constructor(protected contact: Contact) {
      let template = chatWindowTemplate({
         accountId: this.getAccount().getUid(),
         contactId: contact.getId(),
         name: contact.getName()
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

      this.getAccount().triggerChatWindowInitializedHook(this, contact);
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

         setTimeout(function() {
            element.removeClass('jsxc-highlight');
         }, this.HIGHTLIGHT_DURATION)
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
         this.element.find('.jsxc-message-area').prepend(messageElement);
      }

      chatWindowMessage.restoreNextMessage();

      setTimeout(() => this.scrollMessageAreaToBottom(), 500);

      return chatWindowMessage;
   }

   public addActionEntry(className: string, cb: (ev) => void) {
      let element = $('<div>');
      element.addClass('jsxc-bar__action-entry')
      element.addClass(className);
      element.on('click', cb);

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

      windowElement.on('dragenter', (ev) => {
         enterCounter++;

         windowElement.addClass('jsxc-dragover');
      });

      windowElement.on('dragleave', (ev) => {
         enterCounter--;

         if (enterCounter === 0) {
            windowElement.removeClass('jsxc-dragover');
         }
      });

      windowElement.on('dragover', (ev) => {
         ev.preventDefault();

         (<any> ev.originalEvent).dataTransfer.dropEffect = 'copy';
      });
   }

   private getController() {
      return this.contact.getChatWindowController();
   }

   private registerHandler() {
      let self = this;
      let contact = this.contact;
      let elementHandler = new ElementHandler(contact);

      elementHandler.add(
         this.element.find('.jsxc-fingerprints')[0],
         function() {
            // showFingerprintsDialog(contact);
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-bar--window')[0],
         () => {
            this.toggle();
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-js-close')[0],
         (ev) => {
            ev.stopPropagation();

            this.getController().close();
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-clear')[0],
         () => {
            this.clear();
         }
      );

      if (this.contact.isChat()) {
         elementHandler.add(
            this.element.find('.jsxc-video')[0],
            (ev) => {
               ev.stopPropagation();

               startCall(contact, this.getAccount());
            }, JINGLE_FEATURES.video
         );

         elementHandler.add(
            this.element.find('.jsxc-audio')[0],
            (ev) => {
               ev.stopPropagation();

               startCall(contact, this.getAccount(), 'audio');
            }, JINGLE_FEATURES.audio
         );

         elementHandler.add(
            this.element.find('.jsxc-share-screen')[0],
            (ev) => {
               ev.stopPropagation();

               startCall(contact, this.getAccount(), 'screen');
            }, JINGLE_FEATURES.screen
         );
      }

      elementHandler.add(
         this.element.find('.jsxc-send-location')[0],
         (ev) => {
            Location.getCurrentLocationAsGeoUri().then(uri => {
               this.sendOutgoingMessage(uri);
            }).catch(err => {
               Log.warn('Could not get current location', err);

               this.getContact().addSystemMessage('Could not get your current location.');
            });
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-message-area')[0],
         function() {
            // check if user clicks element or selects text
            if (typeof getSelection === 'function' && !getSelection().toString()) {
               self.inputElement.focus();
            }
         }
      );
   }

   private registerInputHandler() {
      let self = this;
      let inputElement = this.inputElement;

      inputElement.keyup(self.onInputKeyUp);
      inputElement.keypress(self.onInputKeyPress);
      inputElement.focus(this.onInputFocus);
      inputElement.blur(this.onInputBlur);

      inputElement.mouseenter(function() {
         $('#jsxc-window-list').data('isHover', true);
      }).mouseleave(function() {
         $('#jsxc-window-list').data('isHover', false);
      });
   }

   private onInputKeyUp = (ev) => {
      ev.stopPropagation();
      // let message = <string> $(ev.target).val();

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         // message = '';
      } else {
         this.resizeInputArea();
      }

      if (ev.which === ESC_KEY) {
         this.getController().close();
      }

      let selectionStart = ev.target.selectionStart;
      let selectionEnd = ev.target.selectionEnd;

      if (selectionStart === selectionEnd) {
         // let lastSpaceIndex = message.lastIndexOf(' ') + 1;
         // let lastNewlineIndex = message.lastIndexOf('\n') + 1;
         // let lastWord = message.slice(Math.max(lastSpaceIndex, lastNewlineIndex), selectionStart);

         //@TODO auto complete
      }
   }

   private onInputKeyPress = (ev) => {
      ev.stopPropagation();

      let message: string = <string> $(ev.target).val();

      if (ev.which !== ENTER_KEY || ev.shiftKey || (!message && !this.attachmentDeposition)) {
         return;
      }

      this.sendOutgoingMessage(message);

      $(ev.target).val('');

      this.resizeInputArea();

      ev.preventDefault();
   }

   private onInputFocus = () => {
      if (this.inputBlurTimeout) {
         clearTimeout(this.inputBlurTimeout);
      }

      this.readTimeout = window.setTimeout(() => {
         this.getTranscript().markAllMessagesAsRead();
      }, this.READ_DELAY);

      this.resizeInputArea();
   }

   private onInputBlur = (ev) => {
      if (this.readTimeout) {
         clearTimeout(this.readTimeout);
      }

      this.inputBlurTimeout = window.setTimeout(function() {
         $(ev.target).css('height', '');
      }, this.INPUT_RESIZE_DELAY);
   }

   private sendOutgoingMessage(messageString: string) {
      let message = new Message({
         peer: this.contact.getJid(),
         direction: Message.DIRECTION.OUT,
         type: this.contact.getType(),
         plaintextMessage: messageString,
         attachment: this.attachmentDeposition,
         unread: false,
      });

      this.getTranscript().pushMessage(message);

      this.clearAttachment();

      let pipe = this.getAccount().getPipe('preSendMessage');

      pipe.run(this.contact, message).then(([contact, message]) => {
         this.getAccount().getConnection().sendMessage(message);
      }).catch(err => {
         Log.warn('Error during preSendMessage pipe', err);
      });

      if (messageString === '?' && Client.getOption('theAnswerToAnything') !== false) {
         if (typeof Client.getOption('theAnswerToAnything') === 'undefined' || (Math.random() * 100 % 42) < 1) {
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
   }

   private updateEncryptionState = (encryptionState) => {
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
   }

   private resizeInputArea() {
      let inputElement = this.inputElement;

      if (!inputElement.data('originalScrollHeight')) {
         inputElement.data('originalScrollHeight', inputElement[0].scrollHeight);
      }

      if (inputElement.val()) {
         inputElement.parent().addClass('jsxc-contains-val');
      } else {
         inputElement.parent().removeClass('jsxc-contains-val')
      }

      this.element.removeClass('jsxc-large-send-area')

      if (inputElement.data('originalScrollHeight') < inputElement[0].scrollHeight && inputElement.val()) {
         this.element.addClass('jsxc-large-send-area')
      }
   }

   private initResizableWindow() {
      let element = this.element;
      let fadeElement = element.find('.jsxc-window-fade');

      interact(fadeElement.get(0)).resizable({
         edges: {
            top: true,
            left: true,
            bottom: false,
            right: false,
         },
      }).on('resizestart', () => {
         fadeElement.addClass('jsxc-window-fade--resizing');
      }).on('resizemove', ev => {
         let barHeight = element.find('.jsxc-bar--window').height();
         let windowHeight = $(window).height();

         let newHeight = Math.min(windowHeight - barHeight, ev.rect.height);

         fadeElement.css({
            width: ev.rect.width + 'px',
            height: newHeight + 'px',
         });

         element.find('.jsxc-bar--window').css('width',  fadeElement.width() + 'px');
      }).on('resizeend', () => {
         fadeElement.removeClass('jsxc-window-fade--resizing');
      });

      $(window).on('resize', () => {
         fadeElement.css({
            width: '',
            height: '',
         });

         element.find('.jsxc-bar--window').css('width', '');
      });
   }

   private initEmoticonMenu() {
      let emoticonListElement = this.element.find('.jsxc-menu--emoticons ul');
      let emoticonList = Emoticons.getDefaultEmoticonList();

      emoticonList.forEach(emoticon => {
         let li = $('<li>');

         li.append(Emoticons.toImage(emoticon));
         li.find('div').attr('title', emoticon);
         li.click(() => {
            let inputElement = this.element.find('.jsxc-message-input');
            let inputValue = <string> inputElement.val() || '';
            let selectionStart = (<HTMLInputElement> inputElement[0]).selectionStart;
            let selectionEnd = (<HTMLInputElement> inputElement[0]).selectionEnd;
            let inputStart = inputValue.slice(0, selectionStart);
            let inputEnd = inputValue.slice(selectionEnd);

            let newValue = inputStart;
            newValue += (inputStart.length && inputStart.slice(-1) !== ' ') ? ' ' : '';
            newValue += emoticon;
            newValue += (inputEnd.length && inputEnd.slice(0, 1) !== ' ') ? ' ' : '';
            newValue += inputEnd;

            inputElement.val(newValue);
            inputElement.focus();
         });

         emoticonListElement.prepend(li);
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
   }

   private registerHooks() {
      this.contact.registerHook('encryptionState', this.updateEncryptionState);

      this.contact.registerHook('presence', (newPresence) => {
         this.element.attr('data-presence', Presence[newPresence]);
      });

      this.contact.registerHook('subscription', () => {
         this.element.attr('data-subscription', this.contact.getSubscription());
      });

      this.contact.registerHook('name', (newName) => {
         this.element.find('.jsxc-bar__caption__primary').text(newName);
      });

      this.getTranscript().registerHook('firstMessageId', (firstMessageId) => {
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

      this.encryptionMenu.getButtonElement().click(ev => {
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
         let label = (<any> plugin.constructor).getName().toUpperCase();

         menu.addEntry(label, () => {
            let buttonElement = this.encryptionMenu.getButtonElement();
            buttonElement.addClass('jsxc-transfer--loading');

            plugin.toggleTransfer(this.contact).catch(err => {
               Log.warn('Toggle transfer error:', err);

               this.getContact().addSystemMessage(err.toString());
            }).then(() => {
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
