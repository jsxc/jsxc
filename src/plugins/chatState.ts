/**
 * Implements XEP-0085: Chat State Notifications.
 *
 * @namespace chatState
 * @see {@link http://xmpp.org/extensions/xep-0085.html}
 */

import Client from '../Client'
import Options from '../Options'
import Log from '../util/Log'
import JID from '../JID'
import Connection from '../connection/Connection'
import {PluginInterface} from '../PluginInterface'
import Message from '../Message'

function addReceiptsRequest(message:Message, xmlMsg:Strophe.Builder):void {
   if (!jsxc.xmpp.chatState.isDisabled()) {
      // send active event (XEP-0085)
      xmlMsg.up().c('active', {
         xmlns: Strophe.NS.CHATSTATES
      });
   }
}

Client.addPreSendMessageHook(addReceiptsRequest);

let chatState:any = {
   conn: null,

   /** Delay between two notification on the message composing */
   toComposingNotificationDelay: 900,
};

Client.addConnectionPlugin(ChatState);

class ChatState implements PluginInterface {
   constructor(private connection:Connection) {
      // prevent double execution after reconnect
      $(document).off('composing.chatstates', this.onComposing);
      $(document).off('paused.chatstates', this.onPaused);
      $(document).off('active.chatstates', this.onActive);

      if (this.isDisabled()) {
         Log.debug('chat state notification disabled');

         return;
      }

      $(document).on('composing.chatstates', this.onComposing);
      $(document).on('paused.chatstates', this.onPaused);
      $(document).on('active.chatstates', this.onActive);
   }

   public isDisabled():boolean {
      var options = Options.get('chatState') || {};

      return !options.enable;
   }

   private onComposing(ev, jidString) {
      let jid = new JID(jidString);

      if (this.isDisabled()) {
         return;
      }

      // @TODO ignore own notifications in groupchat

      let chatWindow = ChatWindow.get(jid.bare);

      if (!chatWindow) {
         return;
      }

      let user = chatWindow.type === 'groupchat' ? Strophe.getResourceFromJid(jid.full) : data.name;

      clearTimeout(chatWindow.data('composing-timeout'));

      // add user in array if necessary
      var usersComposing = chatWindow.data('composing') || [];
      if (usersComposing.indexOf(user) === -1) {
         usersComposing.push(user);
         chatWindow.data('composing', usersComposing);
      }

      var textarea = chatWindow.find('.jsxc_textarea');
      var composingNotif = textarea.find('.jsxc_composing');

      if (composingNotif.length < 1) {
         // notification not present, add it
         composingNotif = $('<div>').addClass('jsxc_composing')
            .addClass('jsxc_chatmessage')
            .addClass('jsxc_sys')
            .appendTo(textarea);
      }

      var msg = this._genComposingMsg(usersComposing);
      composingNotif.text(msg);

      // scroll to bottom
      jsxc.gui.window.scrollDown(bid);

      // show message
      composingNotif.addClass('jsxc_fadein');
   }

   private onPaused(ev, jid) {
      var self = chatState;
      var bid = jsxc.jidToBid(jid);
      var data = jsxc.storage.getUserItem('buddy', bid) || null;

      if (!data || chatState.isDisabled()) {
         return;
      }

      var user = data.type === 'groupchat' ? Strophe.getResourceFromJid(jid) : data.name;
      var win = jsxc.gui.window.get(bid);

      if (win.length === 0) {
         return;
      }

      var el = win.find('.jsxc_composing');
      var usersComposing = win.data('composing') || [];

      if (usersComposing.indexOf(user) >= 0) {
         // remove user from list
         usersComposing.splice(usersComposing.indexOf(user), 1);
         win.data('composing', usersComposing);
      }

      if (usersComposing.length === 0) {
         var durationValue = el.css('transition-duration') || '0s';
         var duration = parseFloat(durationValue) || 0;

         if (durationValue.match(/[^m]s$/)) {
            duration *= 1000;
         }

         el.removeClass('jsxc_fadein');

         var to = setTimeout(function() {
            el.remove();
         }, duration);

         win.data('composing-timeout', to);
      } else {
         // update message
         el.text(self._genComposingMsg(usersComposing));
      }
   }

   private onActive(ev, jid) {
      chatState.onPaused(ev, jid);
   }

   private startComposing(bid) {
      var self = chatState;

      if (!conn || !conn.chatstates || chatState.isDisabled()) {
         return;
      }

      var win = jsxc.gui.window.get(bid);
      var timeout = win.data('composing-timeout');
      var type = win.hasClass('jsxc_groupchat') ? 'groupchat' : 'chat';

      if (timeout) {
         // @REVIEW page reload?
         clearTimeout(timeout);
      } else {
         conn.chatstates.sendComposing(bid, type);
      }

      timeout = setTimeout(function() {
         self.pauseComposing(bid, type);

         win.data('composing-timeout', null);
      }, self.toComposingNotificationDelay);

      win.data('composing-timeout', timeout);
   }

   private pauseComposing(bid, type) {
      if (chatState.isDisabled()) {
         return;
      }

      conn.chatstates.sendPaused(bid, type);
   }

   private endComposing(bid) {
      var win = jsxc.gui.window.get(bid);

      if (win.data('composing-timeout')) {
         clearTimeout(win.data('composing-timeout'));
      }
   }

   private _genComposingMsg(usersComposing) {
      if (!usersComposing || usersComposing.length === 0) {
         jsxc.debug('usersComposing array is empty?');

         return '';
      } else {
         return usersComposing.length > 1 ? usersComposing.join(', ') + $.t('_are_composing') :
            usersComposing[0] + $.t('_is_composing');
      }
   }
}

keypress = {
   // I'm composing a message
   if (ev.which !== 13) {
      jsxc.xmpp.chatState.startComposing(bid);
   }

   if (ev.which === 13 && !ev.shiftKey) {
      jsxc.xmpp.chatState.endComposing(bid);
   }
}
