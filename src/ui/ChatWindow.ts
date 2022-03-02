import Log from '../util/Log';
import Contact from '../Contact';
import Menu from './util/Menu';
import Message from '../Message';
import { IMessage } from '../Message.interface';
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
import alertDialog from './dialogs/AlertDialog';
import confirmDialog from './dialogs/confirm';
import { EmojiButton } from '@joeattardi/emoji-button';

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;
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

   private emojiPicker = new EmojiButton();

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

      let messageAreaElement = this.element.find('.jsxc-message-area');
      let anchorElement = this.element.find('.jsxc-message-area-anchor');
      messageAreaElement.on('scroll', function () {
         if (messageAreaElement.text().trim().length > 0) {
            let scrollHeight: number = messageAreaElement[0].scrollHeight;
            let clientHeight: number = messageAreaElement[0].clientHeight;
            let scrollTop: number = messageAreaElement[0].scrollTop;
            if (scrollTop < 0) scrollTop = scrollTop * -1;

            if (!(clientHeight + 42 < scrollHeight - scrollTop)) {
               anchorElement.hide(400);
            } else if (scrollTop > 50) {
               anchorElement.show(400);
            } else {
               anchorElement.hide(400);
            }
         } else {
            anchorElement.hide(400);
         }
      });
      anchorElement.on('click', () => {
         this.scrollMessageAreaToBottom();
      });

      let updateUnreadMessage = () => {
         let unreadMessages = this.contact.getTranscript().getNumberOfUnreadMessages();

         if (unreadMessages > 0 && this.element.hasClass('jsxc-minimized')) {
            this.element.find('.jsxc-bar--window.jsxc-bar').addClass('jsxc-blink-unread-msg');
         } else {
            this.element.find('.jsxc-bar--window.jsxc-bar').removeClass('jsxc-blink-unread-msg');
         }
      };

      this.initFormatTools();

      this.contact.getTranscript().registerHook('unreadMessageIds', updateUnreadMessage);
      updateUnreadMessage();

      let useExtendedEmojiPicker = Client.getOption('useExtendedEmojiPicker') || false;
      if (useExtendedEmojiPicker) {
         this.initExtendedEmojiButton();
      }
   }

   private initExtendedEmojiButton() {
      this.element.find('.jsxc-menu--emoticons').addClass('jsxc-hidden');
      let emojiButton = this.element.find('.jsxc-menu-extended-emoticons');
      emojiButton.removeClass('jsxc-hidden');

      this.emojiPicker.on('emoji', selection => {
         this.inputElement.val(this.inputElement.val() + selection.emoji);
      });
      emojiButton.on('click', () => {
         this.emojiPicker.togglePicker(emojiButton[0]);
         if (this.emojiPicker.isPickerVisible()) {
            $('.emoji-picker__wrapper input').attr('placeholder', Translation.t('search_emoji'));
         }
      });
   }

   private initFormatTools(): void {
      let formatTools = this.element.find('.jsxc-format-input');
      let useFormatTools = Client.getOption('useFormatTools') || false;
      if (useFormatTools) {
         formatTools.removeClass('jsxc-hidden');
      } else {
         formatTools.addClass('jsxc-hidden');
      }

      formatTools.find('.jsxc-format-bold').on('click', () => {
         this.insertFormatedText('bold');
      });
      formatTools.find('.jsxc-format-italic').on('click', () => {
         this.insertFormatedText('italic');
      });
      formatTools.find('.jsxc-format-code').on('click', () => {
         this.insertFormatedText('code');
      });
      formatTools.find('.jsxc-format-strike').on('click', () => {
         this.insertFormatedText('strike');
      });

      formatTools.find('.jsxc-format-help').on('click', () => {
         alertDialog(Translation.t('show_format_pref'), Translation.t('help_format_tools'), Translation.t('Close'));
      });

      formatTools.find('.jsxc-format-close').on('click', () => {
         confirmDialog(Translation.t('close_toolbar_message'))
            .getPromise()
            .then(() => {
               Client.setOption('useFormatTools', false);
               formatTools.addClass('jsxc-hidden');
            })
            .catch(() => {
               //console.debug('confirm canceled');
            });
      });
   }

   private insertFormatedText(type: string): void {
      let BOLD: string = '*';
      let ITALIC: string = '_';
      let CODE: string = '`';
      let STRIKE: string = '~';

      let selStart = (<HTMLInputElement>this.inputElement[0]).selectionStart;
      let selEnd = (<HTMLInputElement>this.inputElement[0]).selectionEnd;

      let selected = selStart === selEnd ? false : true;

      let selectedText = selected ? this.inputElement.val().toString().substring(selStart, selEnd) : '';

      if (selectedText.trim().length < selectedText.length) {
         selectedText = selectedText.trim();
         selEnd = selStart + selectedText.length;
      }

      switch (type) {
         case 'bold':
            if (selectedText.length !== 0) {
               let text = this.inputElement.val().toString();
               text =
                  text.substring(0, selStart) + BOLD + text.substring(selStart, selEnd) + BOLD + text.substring(selEnd);
               this.inputElement.val(text);
            } else {
               let text = this.inputElement.val().toString();
               text = [
                  text.slice(0, (<HTMLInputElement>this.inputElement[0]).selectionStart),
                  BOLD,
                  text.slice((<HTMLInputElement>this.inputElement[0]).selectionStart),
               ].join('');
               this.inputElement.val(text);
            }
            return;
         case 'italic':
            if (selectedText.length !== 0) {
               let text = this.inputElement.val().toString();
               text =
                  text.substring(0, selStart) +
                  ITALIC +
                  text.substring(selStart, selEnd) +
                  ITALIC +
                  text.substring(selEnd);
               this.inputElement.val(text);
            } else {
               let text = this.inputElement.val().toString();
               text = [
                  text.slice(0, (<HTMLInputElement>this.inputElement[0]).selectionStart),
                  ITALIC,
                  text.slice((<HTMLInputElement>this.inputElement[0]).selectionStart),
               ].join('');
               this.inputElement.val(text);
            }
            return;
         case 'code':
            if (selectedText.length !== 0) {
               let text = this.inputElement.val().toString();
               text =
                  text.substring(0, selStart) + CODE + text.substring(selStart, selEnd) + CODE + text.substring(selEnd);
               this.inputElement.val(text);
            } else {
               let text = this.inputElement.val().toString();
               text = [
                  text.slice(0, (<HTMLInputElement>this.inputElement[0]).selectionStart),
                  CODE,
                  text.slice((<HTMLInputElement>this.inputElement[0]).selectionStart),
               ].join('');
               this.inputElement.val(text);
            }
            return;
         case 'strike':
            if (selectedText.length !== 0) {
               let text = this.inputElement.val().toString();
               text =
                  text.substring(0, selStart) +
                  STRIKE +
                  text.substring(selStart, selEnd) +
                  STRIKE +
                  text.substring(selEnd);
               this.inputElement.val(text);
            } else {
               let text = this.inputElement.val().toString();
               text = [
                  text.slice(0, (<HTMLInputElement>this.inputElement[0]).selectionStart),
                  STRIKE,
                  text.slice((<HTMLInputElement>this.inputElement[0]).selectionStart),
               ].join('');
               this.inputElement.val(text);
            }
            return;
      }
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

      this.element.find('.jsxc-message-area').empty().trigger('scroll');

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

   public getInput(): string {
      return this.inputElement.val().toString();
   }

   public setInput(text: string) {
      this.inputElement.val(text);
      this.inputElement.trigger('focus');

      this.resizeInputArea();
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

      let anchorElement = this.element.find('.jsxc-message-area-anchor');
      if (!anchorElement.is(':visible')) {
         setTimeout(() => this.scrollMessageAreaToBottom(), 500);
      }

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

   public getAttachment(): Attachment {
      return this.attachmentDeposition;
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
   }

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

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         // message = '';
      } else {
         this.resizeInputArea();
      }

      if (ev.which === ESC_KEY) {
         this.getController().close();
      }

      if (
         ev.which === UP_KEY &&
         (this.inputElement.val() === null || this.inputElement.val().toString().trim().length === 0)
      ) {
         let firstMessage = this.getTranscript().getFirstOutgoingMessage();
         if (firstMessage) {
            this.inputElement.val('/fix ' + firstMessage.getPlaintextMessage());
         }
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

      pipe
         .run(this.contact, message)
         .then(([contact, message]) => {
            this.getAccount().getConnection().sendMessage(message);
         })
         .catch(err => {
            Log.warn('Error during preSendMessage pipe', err);
         });

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
         this.element
            .find('.jsxc-textinput-length')
            .empty()
            .text(Translation.t('message_length') + ': ' + inputElement.val().toString().length);
         inputElement.parent().addClass('jsxc-contains-val');
      } else {
         this.element.find('.jsxc-textinput-length').empty();
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
            let inputValue = <string>inputElement.val() || '';
            let selectionStart = (<HTMLInputElement>inputElement[0]).selectionStart;
            let selectionEnd = (<HTMLInputElement>inputElement[0]).selectionEnd;
            let inputStart = inputValue.slice(0, selectionStart);
            let inputEnd = inputValue.slice(selectionEnd);

            let newValue = inputStart;
            newValue += inputStart.length && inputStart.slice(-1) !== ' ' ? ' ' : '';
            newValue += emoticon;
            newValue += inputEnd.length && inputEnd.slice(0, 1) !== ' ' ? ' ' : '';
            newValue += inputEnd;

            inputElement.val(newValue);
            inputElement.focus();
         });

         emoticonListElement.prepend(li);
      });
   }

   private restoreLocalHistory() {
      let firstMessage = this.getTranscript().getFirstOriginalMessage();

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

         if (!message.isReplacement()) {
            this.postMessage(message);
         }
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
