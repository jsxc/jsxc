import Storage from '../Storage';
import Log from '../util/Log';
import Contact from '../Contact'
import Menu from './util/Menu'
import Options from '../Options'
import Message from '../Message'
import Client from '../Client'
import Account from '../Account'
import * as CONST from '../CONST'
import DateTime from './util/DateTime'
// import showVerificationDialog from './dialogs/verification'
// import showFingerprintsDialog from './dialogs/fingerprints'
import Emoticons from '../Emoticons'
import SortedPersistentMap from '../util/SortedPersistentMap'
import PersistentMap from '../util/PersistentMap'
import AvatarSet from './AvatarSet'
import 'simplebar'
import { startCall } from './actions/call'
import { Presence } from '../connection/AbstractConnection'
import Pipe from '../util/Pipe'
import { EncryptionState } from '../plugin/AbstractPlugin'
import ElementHandler from './util/ElementHandler'
import JID from '../JID'
import HookRepository from '../util/HookRepository'
import ChatWindowMessage from './ChatWindowMessage'
import Transcript from '../Transcript'
import FileTransferHandler from './ChatWindowFileTransferHandler'
import Attachment from '../Attachment'
import beautifyBytes from './util/ByteBeautifier'

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;

export default class ChatWindow {
   public static HookRepository = new HookRepository<(window: ChatWindow, contact: Contact) => void>();

   protected element;

   private inputElement;

   private inputBlurTimeout: number;

   private storage;

   private readonly INPUT_RESIZE_DELAY = 1200;

   private readonly HIGHTLIGHT_DURATION = 600;

   private properties: PersistentMap;

   private chatWindowMessages = {};

   private attachmentDeposition: Attachment;

   constructor(protected account: Account, protected contact: Contact) {
      let template = chatWindowTemplate({
         accountId: account.getUid(),
         contactId: contact.getId(),
         name: contact.getName()
      });
      this.element = $(template);
      this.inputElement = this.element.find('.jsxc-message-input');

      this.storage = account.getStorage();

      Menu.init(this.element.find('.jsxc-menu'));

      this.initResizableWindow();
      this.initEmoticonMenu();
      this.restoreLocalHistory();
      this.registerHandler();
      this.registerInputHandler();
      this.initDroppable();

      new FileTransferHandler(contact, this);

      this.element.find('.jsxc-name').disableSelection();
      this.element.find('.jsxc-window').css('bottom', -1 * this.element.find('.jsxc-window-fade').height());

      this.properties = new PersistentMap(this.storage, 'chatWindow', this.contact.getId());

      if (this.properties.get('minimized') === false) {
         this.unminimize();
      } else {
         this.minimize();
      }

      let avatar = AvatarSet.get(contact);
      avatar.addElement(this.element.find('.jsxc-window-bar .jsxc-avatar'));

      this.initEncryptionIcon();
      this.registerHooks();

      this.element.attr('data-presence', Presence[this.contact.getPresence()]);

      setTimeout(() => {
         this.scrollMessageAreaToBottom();
      }, 500);

      ChatWindow.HookRepository.trigger('initialized', this, contact);
   }

   public getTranscript(): Transcript {
      return this.contact.getTranscript();
   }

   public getChatWindowMessage(message: Message) {
      let id = message.getUid();

      if (!this.chatWindowMessages[id]) {
         this.chatWindowMessages[id] = new ChatWindowMessage(message, this);
      }

      return this.chatWindowMessages[id];
   }

   public getId() {
      return /*this.account.getUid() + '@' +*/ this.contact.getId();
   }

   public getAccount() {
      return this.account;
   }

   public getContact() {
      return this.contact;
   }

   public getDom() {
      return this.element;
   }

   public close() {
      this.element.remove();
   }

   public minimize(ev?) {
      this.element.removeClass('jsxc-normal').addClass('jsxc-minimized');

      this.properties.set('minimized', true);

      //@TODO replace this with max-height css property
      //win.find('.jsxc-window').css('bottom', -1 * win.find('.jsxc-window-fade').height());
   }

   public unminimize(ev?) {
      let element = this.element;

      if (Client.isExtraSmallDevice()) {
         if (parseFloat($('#jsxc-roster').css('right')) >= 0) {
            // duration = jsxc.gui.roster.toggle();
         }

         //@TODO hide all other windows
         //@TODO fullscreen this window
      }

      element.removeClass('jsxc-minimized').addClass('jsxc-normal');

      this.properties.set('minimized', false);

      // @REVIEW is this still required?
      //element.find('.jsxc-window').css('bottom', '0');

      //@TODO scroll message list, so that this window is in the view port

      this.scrollMessageAreaToBottom();

      if (ev && ev.target) {
         element.find('.jsxc-textinput').focus();
      }
   }

   public clear() {
      this.chatWindowMessages = {};

      this.getTranscript().clear();

      this.element.find('.jsxc-message-area').empty();

      ChatWindow.HookRepository.trigger('cleared', this, this.contact);
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
      this.element.find('.jsxc-window-bar .jsxc-subcaption').text(text);
   }

   public addSystemMessage(messageString: string) {
      let message = new Message({
         peer: this.contact.getJid(),
         direction: Message.DIRECTION.SYS,
         plaintextMessage: messageString
      });

      this.getTranscript().pushMessage(message);
   }

   public postMessage(message: Message): ChatWindowMessage {
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
      element.addClass('jsxc-action-entry')
      element.addClass(className);
      element.on('click', cb);

      this.element.find('.jsxc-action-entry.jsxc-close').before(element);
   }

   public addMenuEntry(className: string, label: string, cb: (ev) => void) {
      let element = $('<a>');
      element.attr('href', '#');
      element.addClass(className);
      element.text(label);
      element.on('click', cb);

      this.element.find('.jsxc-window-bar .jsxc-menu ul').append($('<li>').append(element));
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
         ev.originalEvent.dataTransfer.dropEffect = 'copy';
      });
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
         this.element.find('.jsxc-window-bar')[0],
         () => {
            this.toggle();
         }
      );

      elementHandler.add(
         this.element.find('.jsxc-close')[0],
         () => {
            this.contact.closeChatWindow();
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

            startCall(contact, this.account);
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

            startCall(contact, this.account, 'audio');
         }, [
            'urn:xmpp:jingle:apps:rtp:audio',
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:xmpp:jingle:apps:dtls:0'
         ]
      );

      elementHandler.add(
         this.element.find('.jsxc-sendFile')[0],
         function() {
            $('body').click();

            // jsxc.gui.window.sendFile(bid);
         }
      );

      // elementHandler.add(
      //    this.element.find('.jsxc-share-screen')[0],
      //    (ev) => {
      //       ev.stopPropagation();
      //
      //       startCall(contact, this.account, 'screen');
      //    }, [
      //       'urn:xmpp:jingle:transports:ice-udp:1',
      //       'urn:xmpp:jingle:apps:dtls:0'
      //    ]
      // );

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

      // @REVIEW
      inputElement.mouseenter(function() {
         $('#jsxc-window-list').data('isHover', true);
      }).mouseleave(function() {
         $('#jsxc-window-list').data('isHover', false);
      });
   }

   private onInputKeyUp = (ev) => {
      var message = $(ev.target).val();

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         message = '';
      } else {
         this.resizeInputArea();
      }

      if (ev.which === ESC_KEY) {
         this.close();
      }
   }

   private onInputKeyPress = (ev) => {
      let message: string = <string>$(ev.target).val();

      if (ev.which !== ENTER_KEY || ev.shiftKey || !message) {
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

      let pipe = Pipe.get('preSendMessage');

      pipe.run(this.contact, message).then(([contact, message]) => {
         this.getTranscript().pushMessage(message);

         this.getAccount().getConnection().sendMessage(message);
      });

      if (messageString === '?' && Options.get('theAnswerToAnything') !== false) {
         if (typeof Options.get('theAnswerToAnything') === 'undefined' || (Math.random() * 100 % 42) < 1) {
            Options.set('theAnswerToAnything', true);

            this.addSystemMessage('42');
         }
      }
   }

   private toggle = (ev?) => {
      if (this.element.hasClass('jsxc-minimized')) {
         this.unminimize(ev);
      } else {
         this.minimize(ev);
      }
   }

   private updateEncryptionState = (encryptionState) => {
      Log.debug('update window encryption state');

      let transferElement = this.getDom().find('.jsxc-transfer');
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

      element.find('.jsxc-message-area').resizable({
         handles: 'w, nw, n',
         minHeight: 234,
         minWidth: 250,
         resize: function(ev, ui) {
            //jsxc.gui.window.resize(element, ui);
         },
         start: function() {
            element.removeClass('jsxc-normal');
         },
         stop: function() {
            element.addClass('jsxc-normal');
         }
      });
   }

   private initEmoticonMenu() {
      let emoticonListElement = this.element.find('.jsxc-menu-emoticons ul');
      let emoticonList = Emoticons.getDefaultEmoticonList();

      emoticonList.forEach(emoticon => {
         var li = $('<li>');

         li.append(Emoticons.toImage(emoticon));
         li.find('div').attr('title', emoticon);
         li.click(() => {
            let inputElement = this.element.find('.jsxc-message-input');
            let inputValue = inputElement.val() || '';
            let selectionStart = inputElement[0].selectionStart;
            let selectionEnd = inputElement[0].selectionEnd;
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

   private resizeMessageArea(width?: number, height?: number, outer?) {
      let element = this.element;

      if (!element.attr('data-default-height')) {
         element.attr('data-default-height', element.find('.ui-resizable').height());
      }

      if (!element.attr('data-default-width')) {
         element.attr('data-default-width', element.find('.ui-resizable').width());
      }

      //@REVIEW ???
      var outerHeightDiff = (outer) ? element.find('.jsxc-window').outerHeight() - element.find('.ui-resizable').height() : 0;

      width = width || parseInt(element.attr('data-default-width'));
      height = height || parseInt(element.attr('data-default-height')) + outerHeightDiff;

      if (outer) {
         height -= outerHeightDiff;
      }

      element.width(width);

      // @TODO we don't use slimscroll anymore
      element.find('.jsxc-message-area').slimScroll({
         height: height
      });

      $(document).trigger('resize.window.jsxc', [this]);
   }

   private fullsizeMessageArea() {
      let size: { width: number, height: number } = Options.get('viewport').getSize();
      let barHeight = this.element.find('.jsxc-window-bar').outerHeight();
      let inputHeight = this.inputElement.outerHeight();

      size.width -= 10;
      size.height -= barHeight + inputHeight;

      this.resizeMessageArea(size.width, size.height);
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

      this.properties.registerHook('minimized', (minimized) => {
         if (minimized) {
            this.minimize();
         } else {
            this.unminimize();
         }
      });
   }

   private initEncryptionIcon() {
      this.updateEncryptionState(this.contact.getEncryptionState());

      let pluginRepository = this.account.getPluginRepository();
      if (pluginRepository.hasEncryptionPlugin()) {
         let transferElement = this.getDom().find('.jsxc-transfer');

         transferElement.removeClass('jsxc-disabled');
         transferElement.click(() => {
            //@TODO create selection
            pluginRepository.getEncryptionPlugin('otr').toggleTransfer(this.contact);
         })
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
//       win.find('.jsxc-overlay .jsxc-close').off('click').click(function() {
//          jsxc.gui.window.hideOverlay(bid);
//       });
//
//       if (allowClose !== true) {
//          win.find('.jsxc-overlay .jsxc-close').hide();
//       } else {
//          win.find('.jsxc-overlay .jsxc-close').show();
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
//       verify.addClass('jsxc-btn jsxc-btn-primary');
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
