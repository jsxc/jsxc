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
import * as Resizable from 'resizable'

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;

export enum State { Open, Minimized, Closed };

export default class ChatWindow {
   protected element: JQuery<HTMLElement>;

   private inputElement: JQuery<HTMLElement>;

   private inputBlurTimeout: number;

   private readonly INPUT_RESIZE_DELAY = 1200;

   private readonly HIGHTLIGHT_DURATION = 600;

   private chatWindowMessages = {};

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

      new FileTransferHandler(contact, this);

      this.element.find('.jsxc-window').css('bottom', -1 * this.element.find('.jsxc-window-fade').height());

      let avatar = AvatarSet.get(contact);
      avatar.addElement(this.element.find('.jsxc-bar--window .jsxc-avatar'));

      this.initEncryptionIcon();
      this.registerHooks();

      this.element.attr('data-presence', Presence[this.contact.getPresence()]);

      setTimeout(() => {
         this.scrollMessageAreaToBottom();
      }, 500);

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

   public getContact() {
      return this.contact;
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

      //@TODO scroll message list, so that this window is in the view port
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

   public postMessage(message: IMessage): ChatWindowMessage {
      if (message.getDirection() === Message.DIRECTION.IN && this.inputElement.is(':focus')) {
         message.read();
      }

      let chatWindowMessage = this.getChatWindowMessage(message);
      let messageElement = chatWindowMessage.getElement();

      if (message.getDOM().length > 0) {
         message.getDOM().replaceWith(messageElement);
      } else {
         this.element.find('.jsxc-message-area').append(messageElement);
      }

      chatWindowMessage.restoreNextMessage();

      this.scrollMessageAreaToBottom();

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
      this.settingsMenu.addEntry(label, cb, className);
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

   protected initDroppable() {
      let windowElement = this.element.find('.jsxc-window');

      windowElement.addClass('jsxc-droppable');

      windowElement.on('dragenter', (ev) => {
         ev.preventDefault();

         windowElement.addClass('jsxc-dragover');
      });

      windowElement.on('dragleave', (ev) => {
         ev.preventDefault();

         windowElement.removeClass('jsxc-dragover');
      });

      windowElement.on('dragover', (ev) => {
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

      elementHandler.add(
         this.element.find('.jsxc-verification')[0],
         function() {
            // showVerificationDialog(contact);
         }
      );

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
         () => {
            this.getController().close();
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-clear')[0],
         () => {
            this.clear();
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-video')[0],
         (ev) => {
            ev.stopPropagation();

            startCall(contact, this.getAccount());
         }, [
            'urn:xmpp:jingle:apps:rtp:video',
            'urn:xmpp:jingle:apps:rtp:audio',
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:xmpp:jingle:apps:dtls:0'
         ]
      );

      elementHandler.add(
         this.element.find('.jsxc-audio')[0],
         (ev) => {
            ev.stopPropagation();

            startCall(contact, this.getAccount(), 'audio');
         }, [
            'urn:xmpp:jingle:apps:rtp:audio',
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:xmpp:jingle:apps:dtls:0'
         ]
      );

      elementHandler.add(
         this.element.find('.jsxc-send-file')[0],
         function() {
            $('body').click();

            // jsxc.gui.window.sendFile(bid);
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-share-screen')[0],
         (ev) => {
            console.log('share screen')
            ev.stopPropagation();

            startCall(contact, this.getAccount(), 'screen');
         }, [
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:xmpp:jingle:apps:dtls:0'
         ]
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
      var textinputBlurTimeout;
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
      let message = <string>$(ev.target).val();

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         message = '';
      } else {
         this.resizeInputArea();
      }

      if (ev.which === ESC_KEY) {
         this.getController().close();
      }

      let selectionStart = ev.target.selectionStart;
      let selectionEnd = ev.target.selectionEnd;

      if (selectionStart === selectionEnd) {
         let lastSpaceIndex = message.lastIndexOf(' ') + 1;
         let lastNewlineIndex = message.lastIndexOf('\n') + 1;
         let lastWord = message.slice(Math.max(lastSpaceIndex, lastNewlineIndex), selectionStart);

         //@TODO auto complete
      }
   }

   private onInputKeyPress = (ev) => {
      let message: string = <string>$(ev.target).val();

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

      this.getTranscript().markAllMessagesAsRead();

      this.resizeInputArea();
   }

   private onInputBlur = (ev) => {
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
         attachment: this.attachmentDeposition
      });

      this.clearAttachment();

      let pipe = this.getAccount().getPipe('preSendMessage');

      pipe.run(this.contact, message).then(([contact, message]) => {
         this.getTranscript().pushMessage(message);

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

      new Resizable(fadeElement.get(0), {
         handles: 'n,nw,w',
         resize: () => {
            let newWidth = fadeElement.width();

            element.find('.jsxc-bar--window').css('width', newWidth + 'px');
         }
      });
   }

   private initEmoticonMenu() {
      let emoticonListElement = this.element.find('.jsxc-menu--emoticons ul');
      let emoticonList = Emoticons.getDefaultEmoticonList();

      emoticonList.forEach(emoticon => {
         var li = $('<li>');

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

      this.contact.registerHook('name', (newName) => {
         this.element.find('.jsxc-name').text(newName);
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

         let encryptionPluginName = this.contact.getEncryptionPluginName();

         pluginRepository.getEncryptionPlugin(encryptionPluginName).toggleTransfer(this.contact);

         ev.preventDefault();
         ev.stopPropagation();

         return false;
      });

      let menu = this.encryptionMenu;

      for (let plugin of encryptionPlugins) {
         let label = (<any>plugin.constructor).getName().toUpperCase();

         menu.addEntry(label, () => {
            //@TODO show spinner
            try {
               plugin.toggleTransfer(this.contact);
            } catch (err) {
               Log.warn('Toggle transfer error:', err);

               this.getContact().addSystemMessage(err.toString());
            }
         });
      }

      let menuElement = this.encryptionMenu.getElement();

      if (menuElement.find('li').length > 0) {
         menuElement.removeClass('jsxc-disabled');
      }
   }
}

// w = {
//
//    updateProgress: function(message, sent, size) {
//       var div = message.getDOM();
//       var span = div.find('.jsxc-timestamp span');
//
//       if (span.length === 0) {
//          div.find('.jsxc-timestamp').append('<span>');
//          span = div.find('.jsxc-timestamp span');
//       }
//
//       span.text(' ' + Math.round(sent / size * 100) + '%');
//
//       if (sent === size) {
//          span.remove();
//       }
//    },
//
//    showOverlay: function(bid, content, allowClose) {
//       var win = jsxc.gui.window.get(bid);
//
//       win.find('.jsxc-overlay .jsxc-body').empty().append(content);
//       win.find('.jsxc-overlay .jsxc-js-close').off('click').click(function() {
//          jsxc.gui.window.hideOverlay(bid);
//       });
//
//       if (allowClose !== true) {
//          win.find('.jsxc-overlay .jsxc-js-close').hide();
//       } else {
//          win.find('.jsxc-overlay .jsxc-js-close').show();
//       }
//
//       win.addClass('jsxc-showOverlay');
//    },
//
//    hideOverlay: function(bid) {
//       var win = jsxc.gui.window.get(bid);
//
//       win.removeClass('jsxc-showOverlay');
//    },
//
//    selectResource: function(bid, text, cb, res) {
//       res = res || jsxc.storage.getUserItem('res', bid) || [];
//       cb = cb || function() {};
//
//       if (res.length > 0) {
//          var content = $('<div>');
//          var list = $('<ul>'),
//             i, li;
//
//          for (i = 0; i < res.length; i++) {
//             li = $('<li>');
//
//             li.append($('<a>').text(res[i]));
//             li.appendTo(list);
//          }
//
//          list.find('a').click(function(ev) {
//             ev.preventDefault();
//
//             jsxc.gui.window.hideOverlay(bid);
//
//             cb({
//                status: 'selected',
//                result: $(this).text()
//             });
//          });
//
//          if (text) {
//             $('<p>').text(text).appendTo(content);
//          }
//
//          list.appendTo(content);
//
//          jsxc.gui.window.showOverlay(bid, content);
//       } else {
//          cb({
//             status: 'unavailable'
//          });
//       }
//    },
//
//    smpRequest: function(bid, question) {
//       var content = $('<div>');
//
//       var p = $('<p>');
//       p.text($.t('smpRequestReceived'));
//       p.appendTo(content);
//
//       var abort = $('<button>');
//       abort.text($.t('Abort'));
//       abort.click(function() {
//          jsxc.gui.window.hideOverlay(bid);
//          jsxc.storage.removeUserItem('smp', bid);
//
//          if (jsxc.master && jsxc.otr.objects[bid]) {
//             jsxc.otr.objects[bid].sm.abort();
//          }
//       });
//       abort.appendTo(content);
//
//       var verify = $('<button>');
//       verify.text($.t('Verify'));
//       verify.addClass('jsxc-button jsxc-button---primary');
//       verify.click(function() {
//          jsxc.gui.window.hideOverlay(bid);
//
//          jsxc.otr.onSmpQuestion(bid, question);
//       });
//       verify.appendTo(content);
//
//       jsxc.gui.window.showOverlay(bid, content);
//    },
//
//    sendFile: function(jid) {
//       jsxc.fileTransfer.startGuiAction(jid);
//    }
// };
