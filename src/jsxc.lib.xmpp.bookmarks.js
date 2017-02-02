/**
 * Load and save bookmarks according to XEP-0048.
 *
 * @namespace jsxc.xmpp.bookmarks
 */
jsxc.xmpp.bookmarks = {};

/**
 * Determines if server is able to store bookmarks.
 *
 * @return {boolean} True: Server supports bookmark storage
 */
jsxc.xmpp.bookmarks.remote = function() {
   return jsxc.xmpp.conn.caps && jsxc.xmpp.hasFeatureByJid(jsxc.xmpp.conn.domain, Strophe.NS.PUBSUB + "#publish");
};

/**
 * Load bookmarks from pubsub.
 *
 * @memberOf jsxc.xmpp.bookmarks
 */
jsxc.xmpp.bookmarks.load = function() {
   var caps = jsxc.xmpp.conn.caps;
   var ver = caps._jidVerIndex[jsxc.xmpp.conn.domain];

   if (!ver || !caps._knownCapabilities[ver]) {
      // wait until we know server capabilities
      $(document).on('caps.strophe', function(ev, from) {
         if (from === jsxc.xmpp.conn.domain) {
            jsxc.xmpp.bookmarks.load();

            $(document).off(ev);
         }
      });
   }

   if (jsxc.xmpp.bookmarks.remote()) {
      jsxc.xmpp.bookmarks.loadFromRemote();
   } else {
      jsxc.xmpp.bookmarks.loadFromLocal();
   }
};

/**
 * Load bookmarks from local storage.
 *
 * @private
 */
jsxc.xmpp.bookmarks.loadFromLocal = function() {
   jsxc.debug('Load bookmarks from local storage');

   var bookmarks = jsxc.storage.getUserItem('bookmarks') || [];
   var bl = jsxc.storage.getUserItem('buddylist') || [];

   $.each(bookmarks, function() {
      var room = this;
      var roomdata = jsxc.storage.getUserItem('buddy', room) || {};

      bl.push(room);
      jsxc.gui.roster.add(room);

      if (roomdata.autojoin) {
         jsxc.debug('auto join ' + room);
         jsxc.xmpp.conn.muc.join(room, roomdata.nickname);
      }
   });

   jsxc.storage.setUserItem('buddylist', bl);
};

/**
 * Load bookmarks from remote storage.
 *
 * @private
 */
jsxc.xmpp.bookmarks.loadFromRemote = function() {
   jsxc.debug('Load bookmarks from pubsub');

   var bookmarks = jsxc.xmpp.conn.bookmarks;

   bookmarks.get(function(stanza) {
      var bl = jsxc.storage.getUserItem('buddylist');

      $(stanza).find('conference').each(function() {
         var conference = $(this);
         var room = conference.attr('jid');
         var roomName = conference.attr('name') || room;
         var autojoin = conference.attr('autojoin') || false;
         var nickname = conference.find('nick').text();
         nickname = (nickname.length > 0) ? nickname : Strophe.getNodeFromJid(jsxc.xmpp.conn.jid);

         if (autojoin === 'true') {
            autojoin = true;
         } else if (autojoin === 'false') {
            autojoin = false;
         }

         var data = jsxc.storage.getUserItem('buddy', room) || {};

         data = $.extend(data, {
            jid: room,
            name: roomName,
            sub: 'both',
            status: 0,
            type: 'groupchat',
            state: jsxc.muc.CONST.ROOMSTATE.INIT,
            subject: null,
            bookmarked: true,
            autojoin: autojoin,
            nickname: nickname
         });

         jsxc.storage.setUserItem('buddy', room, data);

         bl.push(room);
         jsxc.gui.roster.add(room);

         if (autojoin) {
            jsxc.debug('auto join ' + room);
            jsxc.xmpp.conn.muc.join(room, nickname);
         }
      });

      jsxc.storage.setUserItem('buddylist', bl);
   }, function(stanza) {
      var err = jsxc.xmpp.bookmarks.parseErr(stanza);

      if (err.reasons[0] === 'item-not-found') {
         jsxc.debug('create bookmark node');

         bookmarks.createBookmarksNode(function() {
            jsxc.debug('Bookmark node created.');
         }, function() {
            jsxc.debug('Could not create bookmark node.');
         });
      } else {
         jsxc.debug('[XMPP] Could not create bookmark: ' + err.type, err.reasons);
      }
   });
};

/**
 * Parse received error.
 *
 * @param  {string} stanza
 * @return {object} err - The parsed error
 * @return {string} err.type - XMPP error type
 * @return {array} err.reasons - Array of error reasons
 */
jsxc.xmpp.bookmarks.parseErr = function(stanza) {
   var error = $(stanza).find('error');
   var type = error.attr('type');
   var reasons = error.children().map(function() {
      return $(this).prop('tagName');
   });

   return {
      type: type,
      reasons: reasons
   };
};

/**
 * Deletes the bookmark for the given room and removes it from the roster if soft is false.
 *
 * @param  {string} room - room jid
 * @param  {boolean} [soft=false] - True: leave room in roster
 */
jsxc.xmpp.bookmarks.delete = function(room, soft) {

   if (!soft) {
      jsxc.gui.roster.purge(room);
   }

   if (jsxc.xmpp.bookmarks.remote()) {
      jsxc.xmpp.bookmarks.deleteFromRemote(room, soft);
   } else {
      jsxc.xmpp.bookmarks.deleteFromLocal(room, soft);
   }
};

/**
 * Delete bookmark from remote storage.
 *
 * @private
 * @param  {string} room - room jid
 * @param  {boolean} [soft=false] - True: leave room in roster
 */
jsxc.xmpp.bookmarks.deleteFromRemote = function(room, soft) {
   var bookmarks = jsxc.xmpp.conn.bookmarks;

   bookmarks.delete(room, function() {
      jsxc.debug('Bookmark deleted ' + room);

      if (soft) {
         jsxc.gui.roster.getItem(room).removeClass('jsxc_bookmarked');
         jsxc.storage.updateUserItem('buddy', room, 'bookmarked', false);
         jsxc.storage.updateUserItem('buddy', room, 'autojoin', false);
      }
   }, function(stanza) {
      var err = jsxc.xmpp.bookmarks.parseErr(stanza);

      jsxc.debug('[XMPP] Could not delete bookmark: ' + err.type, err.reasons);
   });
};

/**
 * Delete bookmark from local storage.
 *
 * @private
 * @param  {string} room - room jid
 * @param  {boolean} [soft=false] - True: leave room in roster
 */
jsxc.xmpp.bookmarks.deleteFromLocal = function(room, soft) {
   var bookmarks = jsxc.storage.getUserItem('bookmarks');
   var index = bookmarks.indexOf(room);

   if (index > -1) {
      bookmarks.splice(index, 1);
   }

   jsxc.storage.setUserItem('bookmarks', bookmarks);

   if (soft) {
      jsxc.gui.roster.getItem(room).removeClass('jsxc_bookmarked');
      jsxc.storage.updateUserItem('buddy', room, 'bookmarked', false);
      jsxc.storage.updateUserItem('buddy', room, 'autojoin', false);
   }
};

/**
 * Adds or overwrites bookmark for given room.
 *
 * @param  {string} room - room jid
 * @param  {string} alias - room alias
 * @param  {string} nick - preferred user nickname
 * @param  {boolean} autojoin - should we join this room after login?
 */
jsxc.xmpp.bookmarks.add = function(room, alias, nick, autojoin) {
   if (jsxc.xmpp.bookmarks.remote()) {
      jsxc.xmpp.bookmarks.addToRemote(room, alias, nick, autojoin);
   } else {
      jsxc.xmpp.bookmarks.addToLocal(room, alias, nick, autojoin);
   }
};

/**
 * Adds or overwrites bookmark for given room in remote storage.
 *
 * @private
 * @param  {string} room - room jid
 * @param  {string} alias - room alias
 * @param  {string} nick - preferred user nickname
 * @param  {boolean} autojoin - should we join this room after login?
 */
jsxc.xmpp.bookmarks.addToRemote = function(room, alias, nick, autojoin) {
   var bookmarks = jsxc.xmpp.conn.bookmarks;

   var success = function() {
      jsxc.debug('New bookmark created', room);

      jsxc.gui.roster.getItem(room).addClass('jsxc_bookmarked');
      jsxc.storage.updateUserItem('buddy', room, 'bookmarked', true);
      jsxc.storage.updateUserItem('buddy', room, 'autojoin', autojoin);
      jsxc.storage.updateUserItem('buddy', room, 'nickname', nick);
   };
   var error = function() {
      jsxc.warn('Could not create bookmark', room);
   };

   bookmarks.add(room, alias, nick, autojoin, success, error);
};

/**
 * Adds or overwrites bookmark for given room in local storage.
 *
 * @private
 * @param  {string} room - room jid
 * @param  {string} alias - room alias
 * @param  {string} nick - preferred user nickname
 * @param  {boolean} autojoin - should we join this room after login?
 */
jsxc.xmpp.bookmarks.addToLocal = function(room, alias, nick, autojoin) {
   jsxc.gui.roster.getItem(room).addClass('jsxc_bookmarked');
   jsxc.storage.updateUserItem('buddy', room, 'bookmarked', true);
   jsxc.storage.updateUserItem('buddy', room, 'autojoin', autojoin);
   jsxc.storage.updateUserItem('buddy', room, 'nickname', nick);

   var bookmarks = jsxc.storage.getUserItem('bookmarks') || [];

   if (bookmarks.indexOf(room) < 0) {
      bookmarks.push(room);

      jsxc.storage.setUserItem('bookmarks', bookmarks);
   }
};

/**
 * Show dialog to edit bookmark.
 *
 * @param  {string} room - room jid
 */
jsxc.xmpp.bookmarks.showDialog = function(room) {
   var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('bookmarkDialog'));
   var data = jsxc.storage.getUserItem('buddy', room);

   $('#jsxc_room').val(room);
   $('#jsxc_nickname').val(data.nickname);

   $('#jsxc_bookmark').change(function() {
      if ($(this).prop('checked')) {
         $('#jsxc_nickname').prop('disabled', false);
         $('#jsxc_autojoin').prop('disabled', false);
         $('#jsxc_autojoin').parent('.checkbox').removeClass('disabled');
      } else {
         $('#jsxc_nickname').prop('disabled', true);
         $('#jsxc_autojoin').prop('disabled', true).prop('checked', false);
         $('#jsxc_autojoin').parent('.checkbox').addClass('disabled');
      }
   });

   $('#jsxc_bookmark').prop('checked', data.bookmarked);
   $('#jsxc_autojoin').prop('checked', data.autojoin);

   $('#jsxc_bookmark').change();

   dialog.find('form').submit(function(ev) {
      ev.preventDefault();

      var bookmarked = $('#jsxc_bookmark').prop('checked');
      var autojoin = $('#jsxc_autojoin').prop('checked');
      var nickname = $('#jsxc_nickname').val();

      if (bookmarked) {
         jsxc.xmpp.bookmarks.add(room, data.name, nickname, autojoin);
      } else if (data.bookmarked) {
         // bookmarked === false
         jsxc.xmpp.bookmarks.delete(room, true);
      }

      jsxc.gui.dialog.close();

      return false;
   });
};
