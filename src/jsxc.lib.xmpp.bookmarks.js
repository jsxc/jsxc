/**
 * Load and save bookmarks according to XEP-0048.
 *
 * @namespace jsxc.xmpp.bookmarks
 */
jsxc.xmpp.bookmarks = {};

/**
 * Load bookmarks from pubsub.
 *
 * @memberOf jsxc.xmpp.bookmarks
 */
jsxc.xmpp.bookmarks.load = function() {
   var bookmarks = jsxc.xmpp.conn.bookmarks;

   //@TODO check server support

   bookmarks.get(function(stanza) {
      var bl = jsxc.storage.getUserItem('buddylist');

      $(stanza).find('conference').each(function() {
         var conference = $(this);
         var room = conference.attr('jid');
         var roomName = conference.attr('name') || room;
         var autojoin = conference.attr('autojoin') || false;
         var nickname = conference.find('nick').text();
         nickname = (nickname.length > 0) ? nickname : Strophe.getNodeFromJid(jsxc.xmpp.conn.jid);

         jsxc.storage.setUserItem('buddy', room, {
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

         bl.push(room);
         jsxc.gui.roster.add(room);

         if (autojoin === 'true') {
            jsxc.debug('auto join ' + room);
            jsxc.xmpp.conn.muc.join(room, nickname);
         }
      });

      jsxc.storage.setUserItem('buddylist', bl);
   }, function(stanza) {
      var err = jsxc.xmpp.bookmarks.parseErr(stanza);

      if (err.reasons[0] === 'item-not-found') {
         jsxc.debug('create bookmark node');

         bookmarks.createBookmarksNode();
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

//@TODO add function
//@TODO sync rename

/**
 * Deletes the bookmark for the given room and removes it from the roster.
 * 
 * @param  {string} room - room jid
 */
jsxc.xmpp.bookmarks.delete = function(room) {
   var bookmarks = jsxc.xmpp.conn.bookmarks;

   jsxc.gui.roster.purge(room);

   bookmarks.delete(room, function() {
      jsxc.debug('Bookmark deleted ' + room);
   }, function(stanza) {
      var err = jsxc.xmpp.bookmarks.parseErr(stanza);

      jsxc.debug('[XMPP] Could not delete bookmark: ' + err.type, err.reasons);
   });
};

/**
 * This function adds the delete handler to the delete button in the roster.
 * 
 * @param event
 * @param {jid} room - room jid
 * @param {buddyData} data - room data
 * @param {jQuery} bud - Roster item
 */
jsxc.xmpp.bookmarks.onAddRoster = function(event, room, data, bud) {

   if (data.type !== 'groupchat') {
      return;
   }

   bud.find('.jsxc_delete').click(function() {
      if (data.bookmarked) {
         jsxc.xmpp.bookmarks.delete(room);
      }

      return false;
   });
};

$(document).on('add.roster.jsxc', jsxc.xmpp.bookmarks.onAddRoster);
