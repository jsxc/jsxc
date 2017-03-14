jsxc.gui.avatar = {
   queue: [],

   PLACEHOLDER: 0,

   DELAY: 300,

   CHUNKSIZE: 20,

   timeout: null,

   lastRun: 0
};

/**
 * Update avatar on all given elements.
 *
 * @memberOf jsxc.gui
 * @param {jQuery} el Elements with subelement .jsxc_avatar
 * @param {string} jid Jid
 * @param {string} aid Avatar id (sha1 hash of image)
 */
jsxc.gui.avatar.update = function(el, jid, aid) {
   var self = jsxc.gui.avatar;

   if (typeof aid === 'undefined') {
      self.set(jid, el, self.PLACEHOLDER);
      return;
   }

   var avatarSrc = jsxc.storage.getUserItem('avatar', aid);

   if (!jsxc.master && !avatarSrc) {
      // force avatar placeholder for slave tab, until master tab requested vCard
      avatarSrc = self.PLACEHOLDER;
   }

   if (avatarSrc !== null) {
      self.set(jid, el, avatarSrc);
   } else {
      var handler_cb = function(stanza) {
         var src = jsxc.gui.avatar.getPhotoFromVcard(stanza);

         jsxc.storage.setUserItem('avatar', aid, src);
         self.set(jid, el, src);
      };

      var error_cb = function(msg) {
         jsxc.warn('Could not load vcard.', msg);

         jsxc.storage.setUserItem('avatar', aid, self.PLACEHOLDER);
         self.set(jid, el, self.PLACEHOLDER);
      };

      var args = [];

      // workaround for https://github.com/strophe/strophejs/issues/172
      if (Strophe.getBareJidFromJid(jid) === Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid)) {
         args = [handler_cb, error_cb];
      } else {
         args = [handler_cb, Strophe.getBareJidFromJid(jid), error_cb];
      }

      jsxc.gui.avatar.queueAction(jid, jsxc.xmpp.conn.vcard.get, args, jsxc.xmpp.conn.vcard);
   }
};

jsxc.gui.avatar.getPhotoFromVcard = function(stanza) {
   jsxc.debug('vCard', stanza);

   var vCard = $(stanza).find("vCard > PHOTO");
   var src;

   if (vCard.length === 0) {
      jsxc.debug('No photo provided');
      src = '0';
   } else if (vCard.find('EXTVAL').length > 0) {
      src = vCard.find('EXTVAL').text();
   } else {
      var img = vCard.find('BINVAL').text();
      var type = vCard.find('TYPE').text();
      src = 'data:' + type + ';base64,' + img;
   }

   // concat chunks
   src = src.replace(/[\t\r\n\f]/gi, '');

   return src;
};

jsxc.gui.avatar.set = function(jid, el, src) {
   var self = jsxc.gui.avatar;

   if (src === self.PLACEHOLDER || src === '0') {
      if (typeof jsxc.options.defaultAvatar === 'function') {
         jsxc.gui.avatar.queueAction(jid, function() {
            jsxc.options.defaultAvatar.call(el, jid);
         });
         return;
      }
      jsxc.gui.avatarPlaceholder(el.find('.jsxc_avatar'), jid);
      return;
   }

   el.find('.jsxc_avatar').removeAttr('style');

   el.find('.jsxc_avatar').css({
      'background-image': 'url(' + src + ')',
      'text-indent': '999px'
   });
};

jsxc.gui.avatar.queueAction = function(jid, fn, args, context) {
   var self = jsxc.gui.avatar;
   var bid = jsxc.jidToBid(jid);
   var data = jsxc.storage.getUserItem('buddy', bid) || {};
   var state = data.status;

   var index = self.queue.indexOf(bid);
   if (index > -1) {
      self.queue.splice(index, 1);
   }

   var action = {
      fn: fn,
      args: args || [],
      context: context || this
   };

   if (state === 0) {
      self.queue.push(action);
   } else {
      self.queue.unshift(action);
   }

   jsxc.gui.avatar.processQueue();
};

jsxc.gui.avatar.processQueue = function() {
   var self = jsxc.gui.avatar;
   var currentTime = (new Date()).getTime();

   if (currentTime - self.lastRun < self.DELAY) {
      if (!self.timeout) {
         self.timeout = setTimeout(self.processQueue, self.DELAY);
      }
      return;
   }

   self.lastRun = currentTime;

   var i, action;
   for (i = 0; i < self.CHUNKSIZE; i++) {
      if (self.queue.length > 0) {
         action = self.queue.shift();
         action.fn.apply(action.context, action.args);
      }
   }

   if (self.queue.length > 0) {
      self.timeout = setTimeout(self.processQueue, self.DELAY);
   } else {
      self.timeout = null;
   }
};
