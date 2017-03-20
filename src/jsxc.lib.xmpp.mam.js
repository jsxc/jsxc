/**
 * Implements XEP-0313: Message Archive Management.
 *
 * @namespace jsxc.xmpp.mam
 * @see {@link https://xmpp.org/extensions/xep-0313.html}
 */
jsxc.xmpp.mam = {
   conn: null
};

jsxc.xmpp.mam.init = function() {
   var self = jsxc.xmpp.mam;

   self.conn = jsxc.xmpp.conn;
};

jsxc.xmpp.mam.isEnabled = function() {
   var self = jsxc.xmpp.mam;
   var mamOptions = jsxc.options.get('mam') || {};

   // prosody does not announce mam:2, while it is supported
   var hasFeatureMam0 = jsxc.xmpp.hasFeatureByJid(self.conn.domain, 'urn:xmpp:mam:0');
   var hasFeatureMam2 = jsxc.xmpp.hasFeatureByJid(self.conn.domain, Strophe.NS.MAM);

   return (hasFeatureMam0 || hasFeatureMam2) && mamOptions.enable;
};

jsxc.xmpp.mam.nextMessages = function(bid) {
   var self = jsxc.xmpp.mam;
   var buddyData = jsxc.storage.getUserItem('buddy', bid) || {};
   var lastArchiveUid = buddyData.lastArchiveUid;
   var queryId = self.conn.getUniqueId();
   var mamOptions = jsxc.options.get('mam') || {};
   var history = jsxc.storage.getUserItem('history', bid) || [];

   if (buddyData.archiveExhausted) {
      jsxc.debug('No more archived messages.');
      return;
   }

   var queryOptions = {
      queryid: queryId,
      before: lastArchiveUid || '',
      with: bid,
      onMessage: function() {
         var args = Array.from(arguments);
         args.unshift(bid);
         self.onMessage.apply(this, args);
         return true;
      },
      onComplete: function() {
         var args = Array.from(arguments);
         args.unshift(bid);
         self.onComplete.apply(this, args);
         return true;
      }
   };

   var oldestMessageId = history[history.length - 1];

   if (oldestMessageId && !lastArchiveUid) {
      var oldestMessage = new jsxc.Message(oldestMessageId);
      queryOptions.end = (new Date(oldestMessage.stamp)).toISOString();
   }

   if (mamOptions.max) {
      queryOptions.max = mamOptions.max;
   }

   self.conn.mam.query(undefined, queryOptions);
};

jsxc.xmpp.mam.onMessage = function(bid, stanza) {
   stanza = $(stanza);
   var result = stanza.find('result[xmlns="' + Strophe.NS.MAM + '"]');
   var queryId = result.attr('queryid');

   if (result.length !== 1) {
      return;
   }

   var forwarded = result.find('forwarded[xmlns="' + jsxc.CONST.NS.FORWARD + '"]');
   var message = forwarded.find('message');
   var messageId = $(message).attr('id');

   if (message.length !== 1) {
      return;
   }

   var from = message.attr('from');
   var to = message.attr('to');

   if (jsxc.jidToBid(from) !== bid && jsxc.jidToBid(to) !== bid) {
      return;
   }

   var delay = forwarded.find('delay[xmlns="urn:xmpp:delay"]');
   var stamp = (delay.length > 0) ? new Date(delay.attr('stamp')) : new Date();
   stamp = stamp.getTime();

   var body = $(message).find('body:first').text();

   if (!body || body.match(/\?OTR/i)) {
      return true;
   }

   var direction = (jsxc.jidToBid(to) === bid) ? jsxc.Message.OUT : jsxc.Message.IN;

   var win = jsxc.gui.window.get(bid);
   var textarea = win.find('.jsxc_textarea');
   if (textarea.find('[id="' + messageId + '"]').length === 0) {
      var pseudoChatElement = $('<div>');
      pseudoChatElement.attr('id', messageId.replace(/:/g, '-'));
      pseudoChatElement.attr('data-queryId', queryId);

      var lastMessage = textarea.find('[data-queryId="' + queryId + '"]').last();
      var history = jsxc.storage.getUserItem('history', bid) || [];

      if (history.indexOf(messageId) < 0) {
         if (lastMessage.length === 0) {
            textarea.prepend(pseudoChatElement);
            history.push(messageId);
         } else {
            lastMessage.after(pseudoChatElement);
            history.splice(history.indexOf(lastMessage.attr('id').replace(/-/g, ':')), 0, messageId);
         }
      }

      jsxc.storage.setUserItem('history', bid, history);
   }

   jsxc.gui.window.postMessage({
      _uid: messageId,
      bid: bid,
      direction: direction,
      msg: body,
      encrypted: false,
      forwarded: true,
      stamp: stamp
   });
};

jsxc.xmpp.mam.onComplete = function(bid, stanza) {
   stanza = $(stanza);
   var fin = stanza.find('fin[xmlns="' + Strophe.NS.MAM + '"]');
   var buddyData = jsxc.storage.getUserItem('buddy', bid) || {};

   buddyData.archiveExhausted = fin.attr('complete') === 'true';
   buddyData.lastArchiveUid = fin.find('first').text();

   jsxc.storage.setUserItem('buddy', bid, buddyData);
};

jsxc.xmpp.mam.initWindow = function(ev, win) {
   var self = jsxc.xmpp.mam;

   if (!jsxc.xmpp.conn && jsxc.master) {
      $(document).one('attached.jsxc', function() {
         self.initWindow(null, win);
      });
      return;
   }

   if (!jsxc.xmpp.mam.isEnabled()) {
      return;
   }

   var bid = win.attr('data-bid');

   var element = $('<div>');
   element.addClass('jsxc_mam-load-more');
   element.appendTo(win.find('.slimScrollDiv'));
   element.click(function() {
      jsxc.xmpp.mam.nextMessages(bid);
   });
   element.text($.t('Load_older_messages'));

   win.find('.jsxc_textarea').scroll(function() {
      var buddyData = jsxc.storage.getUserItem('buddy', bid) || {};

      if (this.scrollTop < 42 && !buddyData.archiveExhausted) {
         element.addClass('jsxc_show');
      } else {
         element.removeClass('jsxc_show');
      }
   });

   win.find('.jsxc_textarea').scroll();
};

$(document).on('attached.jsxc', jsxc.xmpp.mam.init);
$(document).on('init.window.jsxc', jsxc.xmpp.mam.initWindow);
