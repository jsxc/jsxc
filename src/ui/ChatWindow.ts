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
import showVerificationDialog from './dialogs/verification'
import showFingerprintsDialog from './dialogs/fingerprints'
import Emoticons from '../Emoticons'

let chatWindowTemplate = require('../../template/chatWindow.hbs');

const ENTER_KEY = 13;
const ESC_KEY = 27;

export default class ChatWindow {
   private element:JQuery;

   private inputElement:JQuery;

   private inputBlurTimeout:number;

   private storage;

   private readonly INPUT_RESIZE_DELAY = 1200;

   private readonly HIGHTLIGHT_DURATION = 2000;

   private minimized:boolean = false;

   constructor(private account:Account, private contact:Contact) {
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

      this.element.find('.jsxc-name').disableSelection();
      this.element.find('.jsxc-window').css('bottom', -1 * this.element.find('.jsxc-window-fade').height());

      // @TODO update gui
      // @TODO init otr

      $(document).trigger('init.window.jsxc', [this.element]);
   }

   public getId() {
      return this.account.getUid() + '@' + this.contact.getId();
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

      // @REVIEW is this still required?
      //element.find('.jsxc-window').css('bottom', '0');

      //@TODO scroll message list, so that this window is in the view port

      this.scrollMessageAreaToBottom();

      if (ev && ev.target) {
         element.find('.jsxc-textinput').focus();
      }
   }

   public clear() {
      var history = this.storage.getItem('history', this.contact.getId()) || [];

      history.map((id) => {
         this.storage.removeItem('msg', id);
      });

      this.storage.setItem('history', this.contact.getId(), []);

      this.element.find('.jsxc-message-area').empty();
   }

   public highlight() {
      let element = this.element;

      if (!element.hasClass('jsxc-highlight')) {
         element.addClass('jsxc-highlight');

         setTimeout(function(){
            element.removeClass('jsxc-highlight');
         }, this.HIGHTLIGHT_DURATION)
      }
   }

   public postMessage(message:Message) {
      if (message.direction === Message.IN && !this.inputElement.is(':focus')) {
         message.setUnread();
      }

      let messageElement = $('<div>');
      messageElement.addClass('jsxc-chatmessage jsxc-' + message.direction);
      messageElement.attr('id', message.getCssId());
      messageElement.html('<div>' + message.getProcessedBody() + '</div>');

      let timestampElement = $('<div>');
      timestampElement.addClass('jsxc-timestamp');
      DateTime.stringify(message.getStamp(), timestampElement);
      messageElement.append(timestampElement);

      if (message.isReceived()) {
         messageElement.addClass('jsxc-received');
      } else {
         messageElement.removeClass('jsxc-received');
      }

      if (message.forwarded) {
         messageElement.addClass('jsxc-forwarded');
      } else {
         messageElement.removeClass('jsxc-forwarded');
      }

      if (message.encrypted) {
         messageElement.addClass('jsxc-encrypted');
      } else {
         messageElement.removeClass('jsxc-encrypted');
      }

      if (message.error) {
         messageElement.addClass('jsxc-error');
         messageElement.attr('title', message.error);
      } else {
         messageElement.removeClass('jsxc-error');
      }

      if (message.attachment) {
         let attachment = message.attachment;
         let mimeType = attachment.getMimeType();
         let attachmentElement = $('<div>');
         attachmentElement.addClass('jsxc-attachment');
         attachmentElement.addClass('jsxc-' + message.attachment.type.replace(/\//, '-'));
         attachmentElement.addClass('jsxc-' + message.attachment.type.replace(/^([^/]+)\/.*/, '$1'));

         if (attachment.isPersistent()) {
            attachmentElement.addClass('jsxc-persistent');
         }

         if (attachment.isImage() && attachment.hasThumbnailData()) {
            $('<img>')
               .attr('alt', 'preview')
               .attr('src', attachment.getThumbnailData())
               .attr('title', message.getName())
               .appendTo(attachmentElement);
         } else {
            attachmentElement.text(attachment.getName());
         }

         if (message.hasData()) {
            attachmentElement = $('<a>').append(attachmentElement);
            attachmentElement.attr('href', attachment.getData());
            attachmentElement.attr('download', attachment.getName());
         }

         messageElement.find('div').first().append(attachmentElement);
      }

      if (message.direction === Message.SYS) {
         //jsxc.gui.window.get(bid).find('.jsxc-textarea').append('<div class="jsxc-clear"/>');
      } else {
         //@TODO update last message
         //$('[data-bid="' + bid + '"]').find('.jsxc-lastmsg .jsxc-text').html(msg);
      }

      if (message.getDOM().length > 0) {
         message.getDOM().replaceWith(messageElement);
      } else {
         this.element.find('.jsxc-message-area').append(messageElement);
      }

      // if (typeof message.sender === 'object' && message.sender !== null) {
      //    var title = '';
      //    var avatarDiv = $('<div>');
      //    avatarDiv.addClass('jsxc-avatar').prependTo(messageElement);
      //
      //    if (typeof message.sender.jid === 'string') {
      //       messageElement.attr('data-bid', jsxc.jidToBid(message.sender.jid));
      //
      //       var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(message.sender.jid)) || {};
      //       jsxc.gui.updateAvatar(messageElement, jsxc.jidToBid(message.sender.jid), data.avatar);
      //
      //       title = jsxc.jidToBid(message.sender.jid);
      //    }
      //
      //    if (typeof message.sender.name === 'string') {
      //       messageElement.attr('data-name', message.sender.name);
      //
      //       if (typeof message.sender.jid !== 'string') {
      //          jsxc.gui.avatarPlaceholder(avatarDiv, message.sender.name);
      //       }
      //
      //       if (title !== '') {
      //          title = '\n' + title;
      //       }
      //
      //       title = message.sender.name + title;
      //
      //       timestampElement.text(timestampElement.text() + ' ' + message.sender.name);
      //    }
      //
      //    avatarDiv.attr('title', jsxc.escapeHTML(title));
      //
      //    if (messageElement.prev().length > 0 && messageElement.prev().find('.jsxc-avatar').attr('title') === avatarDiv.attr('title')) {
      //       avatarDiv.css('visibility', 'hidden');
      //    }
      // }

      this.scrollMessageAreaToBottom();
   }

   private registerHandler() { console.log('registerHandler')
      let self = this;
      let contact = this.contact;

      this.element.find('.jsxc-verification').click(function() {
         showVerificationDialog(contact);
      });

      this.element.find('.jsxc-fingerprints').click(function() {
         showFingerprintsDialog(contact);
      });

      this.element.find('.jsxc-transfer').click(function() {
         jsxc.otr.toggleTransfer(bid);
      });

      this.element.find('.jsxc-window-bar').click(() => {
         this.toggle();
      });

      this.element.find('.jsxc-close').click(() => {
         this.account.closeChatWindow(this);
      });

      this.element.find('.jsxc-clear').click(() => {
         this.clear();
      });

      this.element.find('.jsxc-sendFile').click(function() {
         $('body').click();

         jsxc.gui.window.sendFile(bid);
      });

      this.element.find('.jsxc-message-area').click(function() {
         // check if user clicks element or selects text
         if (typeof getSelection === 'function' && !getSelection().toString()) {
            self.inputElement.focus();
         }
      });
   }

   private registerInputHandler() { console.log('registerInputHandler')
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
      var body = $(ev.target).val();

      if (ev.which === ENTER_KEY && !ev.shiftKey) {
         body = '';
      }

      if (ev.which === ESC_KEY) {
         this.close();
      }
   }

   private onInputKeyPress = (ev) => {
      let message = $(ev.target).val();

      if (ev.which !== ENTER_KEY || ev.shiftKey || !message) {
         this.resizeInputArea();

         return;
      }

      this.sendOutgoingMessage(message);

      // reset textarea
      $(ev.target).css('height', '').val('');

      ev.preventDefault();
   }

   private onInputFocus = () => {
      if (this.inputBlurTimeout) {
         clearTimeout(this.inputBlurTimeout);
      }

      // remove unread flag
      jsxc.gui.readMsg(bid);

      this.resizeInputArea();
   }

   private onInputBlur = (ev) => {
      this.inputBlurTimeout = setTimeout(function() {
         ev.target.css('height', '');
      }, this.INPUT_RESIZE_DELAY);
   }

   private sendOutgoingMessage(messageString:string) {

      if (this.contact.isEncrypted()) {
         //@TODO send sys $.t('your_message_wasnt_send_please_end_your_private_conversation');
         return;
      }

      let message = new Message({
         peer: this.contact,
         direction: Message.OUT,
         message: messageString
      });
      message.save();

      if (messageString === '?' && Options.get('theAnswerToAnything') !== false) {
         if (typeof Options.get('theAnswerToAnything') === 'undefined' || (Math.random() * 100 % 42) < 1) {
            Options.set('theAnswerToAnything', true);

            (new Message({
               peer: this.contact,
               direction: Message.SYS,
               msg: '42'
            })).save();
         }
      }
   }

   private toggle = (ev?) => { console.log('toggle', this.element)
      if (this.element.hasClass('jsxc-minimized')) {
         this.unminimize(ev);
      } else {
         this.minimize(ev);
      }

      // @TODO update storage
   }

   private resizeInputArea() {
      let inputElement = this.inputElement;

      if (!inputElement.data('originalHeight')) {
         inputElement.data('originalHeight', inputElement.outerHeight());
      }

      // compensate rounding error
      if (inputElement.outerHeight() < (inputElement[0].scrollHeight - 1) && inputElement.val()) {
         inputElement.height(inputElement.data('originalHeight') * 1.5);
      }
   }

   private initResizableWindow() {
      let element = this.element;

      element.find('.jsxc-message-area').resizable({
         handles: 'w, nw, n',
         minHeight: 234,
         minWidth: 250,
         resize: function(ev, ui) {
            jsxc.gui.window.resize(element, ui);
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
      let inputElement = this.element.find('.jsxc-textinput');
      let emoticonListElement = this.element.find('.jsxc-menu-emoticons ul');
      let emoticonList = Emoticons.getDefaultEmoticonList();

      emoticonList.forEach(emoticon => {
         var li = $('<li>');

         li.append(Emoticons.toImage(emoticon));
         li.find('div').attr('title', emoticon);
         li.click(function() {
           inputElement.val(inputElement.val() + emoticon);
           inputElement.focus();
         });

         emoticonListElement.prepend(li);
      });
   }

   private restoreLocalHistory() {
      let history = this.storage.getItem('history', this.contact.getId());

      while (history !== null && history.length > 0) {
         var uid = history.pop();

         this.postMessage(new Message(uid));
      }
   }

   private resizeMessageArea(width?:number, height?:number, outer?) {
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
      let size:{width:number, height:number} = Options.get('viewport').getSize();
      let barHeight = this.element.find('.jsxc-window-bar').outerHeight();
      let inputHeight = this.inputElement.outerHeight();

      size.width -= 10;
      size.height -= barHeight + inputHeight;

      this.resizeMessageArea(size.width, size.height);
   }

   private scrollMessageAreaToBottom() {

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
