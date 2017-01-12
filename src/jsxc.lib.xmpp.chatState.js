/**
 * Implements XEP-0085: Chat State Notifications.
 *
 * @namespace jsxc.xmpp.chatState
 * @see {@link http://xmpp.org/extensions/xep-0085.html}
 */
jsxc.xmpp.chatState = {
   conn: null,

   /** Delay between two notification on the message composing */
   toComposingNotificationDelay: 900,
};

jsxc.xmpp.chatState.init = function() {
   var self = jsxc.xmpp.chatState;

   if (!jsxc.xmpp.conn || !jsxc.xmpp.connected) {
      $(document).on('attached.jsxc', self.init);

      return;
   }

   // prevent double execution after reconnect
   $(document).off('composing.chatstates', jsxc.xmpp.chatState.onComposing);
   $(document).off('paused.chatstates', jsxc.xmpp.chatState.onPaused);
   $(document).off('active.chatstates', jsxc.xmpp.chatState.onActive);

   if (self.isDisabled()) {
      jsxc.debug('chat state notification disabled');

      return;
   }

   self.conn = jsxc.xmpp.conn;

   $(document).on('composing.chatstates', jsxc.xmpp.chatState.onComposing);
   $(document).on('paused.chatstates', jsxc.xmpp.chatState.onPaused);
   $(document).on('active.chatstates', jsxc.xmpp.chatState.onActive);
};

/**
 * Composing event received. Display message.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {Event} ev
 * @param  {String} jid
 */
jsxc.xmpp.chatState.onComposing = function(ev, jid) {
   var self = jsxc.xmpp.chatState;
   var bid = jsxc.jidToBid(jid);
   var data = jsxc.storage.getUserItem('buddy', bid) || null;

   if (!data || jsxc.xmpp.chatState.isDisabled()) {
      return;
   }

   // ignore own notifications in groupchat
   if (data.type === 'groupchat' &&
      Strophe.getResourceFromJid(jid) === Strophe.getNodeFromJid(self.conn.jid)) {
      return;
   }

   var user = data.type === 'groupchat' ? Strophe.getResourceFromJid(jid) : data.name;
   var win = jsxc.gui.window.get(bid);

   if (win.length === 0) {
      return;
   }

   clearTimeout(win.data('composing-timeout'));

   // add user in array if necessary
   var usersComposing = win.data('composing') || [];
   if (usersComposing.indexOf(user) === -1) {
      usersComposing.push(user);
      win.data('composing', usersComposing);
   }

   var textarea = win.find('.jsxc_textarea');
   var composingNotif = textarea.find('.jsxc_composing');

   if (composingNotif.length < 1) {
      // notification not present, add it
      composingNotif = $('<div>').addClass('jsxc_composing')
         .addClass('jsxc_chatmessage')
         .addClass('jsxc_sys')
         .appendTo(textarea);
   }

   var msg = self._genComposingMsg(usersComposing);
   composingNotif.text(msg);

   // scroll to bottom
   jsxc.gui.window.scrollDown(bid);

   // show message
   composingNotif.addClass('jsxc_fadein');
};

/**
 * Pause event receive. Remove or update composing message.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {Event} ev
 * @param  {String} jid
 */
jsxc.xmpp.chatState.onPaused = function(ev, jid) {
   var self = jsxc.xmpp.chatState;
   var bid = jsxc.jidToBid(jid);
   var data = jsxc.storage.getUserItem('buddy', bid) || null;

   if (!data || jsxc.xmpp.chatState.isDisabled()) {
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
};

/**
 * Active event received.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {Event} ev
 * @param  {String} jid
 */
jsxc.xmpp.chatState.onActive = function(ev, jid) {
   jsxc.xmpp.chatState.onPaused(ev, jid);
};

/**
 * Send composing event.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {String} bid
 */
jsxc.xmpp.chatState.startComposing = function(bid) {
   var self = jsxc.xmpp.chatState;

   if (!jsxc.xmpp.conn || !jsxc.xmpp.conn.chatstates || jsxc.xmpp.chatState.isDisabled()) {
      return;
   }

   var win = jsxc.gui.window.get(bid);
   var timeout = win.data('composing-timeout');
   var type = win.hasClass('jsxc_groupchat') ? 'groupchat' : 'chat';

   if (timeout) {
      // @REVIEW page reload?
      clearTimeout(timeout);
   } else {
      jsxc.xmpp.conn.chatstates.sendComposing(bid, type);
   }

   timeout = setTimeout(function() {
      self.pauseComposing(bid, type);

      win.data('composing-timeout', null);
   }, self.toComposingNotificationDelay);

   win.data('composing-timeout', timeout);
};

/**
 * Send pause event.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {String} bid
 */
jsxc.xmpp.chatState.pauseComposing = function(bid, type) {
   if (jsxc.xmpp.chatState.isDisabled()) {
      return;
   }

   jsxc.xmpp.conn.chatstates.sendPaused(bid, type);
};

/**
 * End composing without sending a pause event.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {String} bid
 */
jsxc.xmpp.chatState.endComposing = function(bid) {
   var win = jsxc.gui.window.get(bid);

   if (win.data('composing-timeout')) {
      clearTimeout(win.data('composing-timeout'));
   }
};

/**
 * Generate composing message.
 *
 * @memberOf jsxc.xmpp.chatState
 * @param  {Array} usersComposing List of users which are currently composing a message
 */
jsxc.xmpp.chatState._genComposingMsg = function(usersComposing) {
   if (!usersComposing || usersComposing.length === 0) {
      jsxc.debug('usersComposing array is empty?');

      return '';
   } else {
      return usersComposing.length > 1 ? usersComposing.join(', ') + $.t('_are_composing') :
         usersComposing[0] + $.t('_is_composing');
   }
};

jsxc.xmpp.chatState.isDisabled = function() {
   var options = jsxc.options.get('chatState') || {};

   return !options.enable;
};

$(document).on('attached.jsxc', jsxc.xmpp.chatState.init);
