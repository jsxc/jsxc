jsxc.gui.template.joinChat = '<h3 data-i18n="Join_chat"></h3>\
         <p class=".jsxc_explanation">Blub</p>\
         <p><label for="jsxc_room" data-i18n="Room"></label>\
            <input type="text" name="room" id="jsxc_room" autocomplete="off" list="jsxc_roomlist" required="required" /></p>\
         <datalist id="jsxc_roomlist">\
            <p><label for="jsxc_roomlist_select"></label><select id="jsxc_roomlist_select"><option></option><option>workaround</option></select></p>\
         </datalist>\
         <p><label for="jsxc_nickname" data-i18n="Nickname"></label>\
            <input type="text" name="nickname" id="jsxc_nickname" /></p>\
         <p><label for="jsxc_password" data-i18n="Password"></label>\
            <input type="text" name="password" id="jsxc_password" /></p>\
         <p class="jsxc_right">\
            <a href="#" class="button jsxc_close" data-i18n="Close"></a> <a href="#" class="button creation jsxc_join" data-i18n="Join"></a>\
         </p>';

   jsxc.muc = {
      conn: null,

      init: function() {
         var self = jsxc.muc;

         self.conn = jsxc.xmpp.conn;
         self.conn.addHandler(self.onGroupchatMessage, null, 'message', 'groupchat');
         self.conn.muc.roomNames = jsxc.storage.getUserItem('roomNames') || [];
      },

      initMenu: function() {
         var li = $('<li>').attr('class', 'jsxc_joinChat').text($.t('Join_chat'));

         li.click(jsxc.muc.showJoinChat);

         $('#jsxc_menu ul').append(li);

      },
      showJoinChat: function() {
         var self = jsxc.muc;
         var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('joinChat'));

         // @TODO add spinning wheel
         self.conn.muc.listRooms('conference.localhost', function(stanza){ //@TODO: replace
            // workaround: chrome does not display dropdown arrow for dynamically filled datalists
            $('#jsxc_roomlist option:last').remove();

            $(stanza).find('item').each(function(){
               var r = $('<option>');
               var rjid = $(this).attr('jid').toLowerCase();
               var rnode = Strophe.getNodeFromJid(rjid);
               var rname = $(this).attr('name') || rnode;

               r.text(rname);
               r.attr('data-jid', rjid);
               r.attr('value', rnode);

               $('#jsxc_roomlist select').append(r);
            });
            //@TODO handle <set> element, http://xmpp.org/extensions/xep-0045.html#disco-rooms
         }, function(){
            jsxc.warn('Could not load rooms');
            //@TODO: handle
         });

         dialog.find('.jsxc_join').click(function() {
            var room = ($('#jsxc_room').val())? jsxc.jidToBid($('#jsxc_room').val()) : null;
            var nickname = $('#jsxc_nickname').val() || Strophe.getNodeFromJid(jsxc.xmpp.conn.jid);
            var password = $('#jsxc_password').val() || null;

            if (!room) {
               $('#jsxc_room').addClass('jsxc_invalid').keyup(function() {
                  if ($(this).val()) {
                     $(this).removeClass('jsxc_invalid');
                  }
               });
               return false;
            }

            if (!room.match(/@(.*)$/)) {
               room += '@' + 'conference.localhost'; // @TODO: replace
            }

            var bid = jsxc.jidToBid(room);

            if (jsxc.xmpp.conn.muc.roomNames.indexOf(room) < 0) {
               jsxc.xmpp.conn.muc.join(room, nickname, null, null, null, password);

               // @TODO create instant or reserved room 
               // (prosody supports instant room only in latest version)
               // http://xmpp.org/extensions/xep-0045.html#createroom

               jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);

               var own = jsxc.storage.getUserItem('ownNicknames') || {};
               own[room] = nickname;
               jsxc.storage.setUserItem('ownNicknames', own);

               jsxc.storage.setUserItem('buddy', bid, {
                  jid: room,
                  name: room,
                  sub: 'both',
                  type: 'groupchat'
               });

               var bl = jsxc.storage.getUserItem('buddylist');
               bl.push(bid);
               jsxc.storage.setUserItem('buddylist', bl);

               jsxc.gui.roster.add(bid);
            }

            jsxc.gui.window.open(bid);
            jsxc.gui.dialog.close();
         });

         dialog.find('input').keydown(function(ev) {
            if (ev.which !== 13) {
               return;
            }

            dialog.find('.jsxc_join').click();
         });
      },
      leave: function(bid) {
         var self = jsxc.muc;
         var own = jsxc.storage.getUserItem('ownNicknames') || {};
         
         self.conn.muc.leave(bid, own[bid], function(){
            jsxc.storage.setUserItem('roomNames', self.conn.muc.roomNames);
            
            delete own[bid];
            jsxc.storage.setUserItem('ownNicknames', own);
            jsxc.storage.removeUserItem('member', bid);
            
            jsxc.gui.window.close(bid);
            jsxc.gui.roster.purge(bid);
         });
      },
      initWindow: function(event, win) { 
         var self = jsxc.muc;
         var data = win.data();
         var bid = jsxc.jidToBid(data.jid);
         var sdata = jsxc.storage.getUserItem('window', bid);

         if (!jsxc.xmpp.conn) {
            $(document).one('connectionReady.jsxc', function() {
               self.initWindow(null, win);
            });
            return;
         }

         if (self.conn.muc.roomNames.indexOf(data.jid) < 0) {
            return;
         }

         win.addClass('jsxc_groupchat');
         win.find('.jsxc_tools > .jsxc_transfer').after('<div class="jsxc_members">M</div>');
         var ml = $('<div class="jsxc_memberlist"><ul></ul></div>');
         win.find('.jsxc_fade').prepend(ml);
         
         // update emoticon button
         var top = win.find('.jsxc_emoticons').position().top + win.find('.slimScrollDiv').position().top;
         win.find('.jsxc_emoticons').css('top', top + 'px');

         /*ml.find('ul').slimScroll({
            height: '234px',
            distance: '3px'
         });*/

         var member = jsxc.storage.getUserItem('member', bid) || {};

         $.each(member, function(index, val) {
            self.insertMember(bid, index, val.jid, val.status);
         });

         if (sdata.minimize_ml || sdata.minimize_ml === null) {
            self.hideMemberList(win, 200, true);
         } else {

            setTimeout(function() {
               self.showMemberList(win, 200);
            }, 500);
         }

         win.on('show', function() {
            ml.slideDown();
            ml.css('display', 'block');
         });
         win.on('hide', function() {
            ml.slideUp();
         });

         var leave = $('<li>');
         leave.text($.t('Leave'));
         leave.addClass('jsxc_leave');
         leave.click(function(){
            self.leave(bid);
         });
         
         win.find('.jsxc_settings ul').append(leave);

         //win.trigger((sdata.minimize) ? 'hide' : 'show');
      },
      showMemberList: function() { 
         //win, originalWidth, noani
         /*if (!noani) {
            win.animate({
               width: (originalWidth + 200) + 'px'
            }).css('overflow', 'visible');
         }

         jsxc.storage.updateUserItem('window', jsxc.jidToBid(win.data().jid), 'minimize_ml', false);

         win.find('.jsxc_members').off('click').one('click', function() {
            jsxc.muc.hideMemberList(win, originalWidth);
         });*/
      },
      hideMemberList: function() {
         //win, originalWidth, noani
         /*if (!noani) {
            win.animate({
               width: originalWidth + 'px'
            }).css('overflow', 'visible');
         }

         jsxc.storage.updateUserItem('window', jsxc.jidToBid(win.data().jid), 'minimize_ml', true);

         win.find('.jsxc_members').off('click').one('click', function() {
            jsxc.muc.showMemberList(win, originalWidth);
         });*/
      },
      onPresence: function(event, from, status, presence) {
         var self = jsxc.muc;
         var room = jsxc.jidToBid(from);
         var nickname = Strophe.unescapeNode(Strophe.getResourceFromJid(from));
         var xdata = $(presence).find('x[xmlns^="' + Strophe.NS.MUC + '"]');

         if (self.conn.muc.roomNames.indexOf(room) < 0 || xdata.length === 0) {
            return true;
         }

         var jid = xdata.find('item').attr('jid') || null;

         var member = jsxc.storage.getUserItem('member', room) || {};

         if (status === 0) {
            delete member[nickname];

            self.removeMember(room, nickname);
            jsxc.gui.window.postMessage(room, 'sys', nickname + ' left the building.');
         } else {
            if (!member[nickname]) {
               jsxc.gui.window.postMessage(room, 'sys', nickname + ' entered the room.');
            }

            member[nickname] = {
               jid: jid,
               status: status,
               roomJid: from
            };

            self.insertMember(room, nickname, jid, status);
         }

         jsxc.storage.setUserItem('member', room, member);

         return true;
      },
      insertMember: function(room, nickname, jid) {
         var self = jsxc.muc;
         var win = jsxc.gui.window.get(room);
         var m = win.find('.jsxc_memberlist li[data-nickname="' + nickname + '"]');

         if (m.length === 0) {
            var title = nickname;
            
            m = $('<li><div class="jsxc_avatar"></div></li>');
            m.attr('data-nickname', nickname);

            win.find('.jsxc_memberlist ul').append(m);

            if (typeof jid === 'string') {
               m.attr('data-bid', jsxc.jidToBid(jid));
               title = title + '\n' + jsxc.jidToBid(jid);
 
               var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(jid));
               if (data !== null && typeof data === 'object') {
                  jsxc.gui.updateAvatar(m, jid, data.avatar);
               } else if (jsxc.jidToBid(jid) === jsxc.jidToBid(self.conn.jid)) {
                  jsxc.gui.updateAvatar(m, jid, 'own');
               }
            }
            
            m.attr('title', title);
         }

         /*if (status !== null) {
            m.removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + jsxc.CONST.STATUS[status]);
         }*/
      },
      removeMember: function(room, nickname) {
         var win = jsxc.gui.window.get(room);
         var m = win.find('.jsxc_memberlist li[data-nickname="' + nickname + '"]');

         if (m.length > 0) {
            m.remove();
         }
      },
      onGroupchatMessage: function(message) {
         var id = $(message).attr('id');

         if (jsxc.el_exists($('#' + id))) {
            // ignore own incoming messages
            return true;
         }
         
         var from = $(message).attr('from');
         var body = $(message).find('body:first').text();
         var room = jsxc.jidToBid(from);
         var nickname = Strophe.unescapeNode(Strophe.getResourceFromJid(from));
         var delay = $(message).find('delay[xmlns="urn:xmpp:delay"]');

         var stamp = (delay.length > 0) ? new Date(delay.attr('stamp')) : new Date();
         stamp = stamp.getTime();
         
         var member = jsxc.storage.getUserItem('member', room) || {};
         
         var sender = {};
         sender.name = nickname;
         
         if (member[nickname] && typeof member[nickname].jid === 'string') {
            sender.jid = member[nickname].jid;
         }

         jsxc.gui.window.postMessage(room, 'in', body, false, false, stamp, sender);

         return true;
      },
      onAddRoster: function(event, bid, data, bud) {
         var self = jsxc.muc;
         
         if (data.type !== 'groupchat') {
            return;
         }
         
         bud.find('.jsxc_delete').off('click').click(function() {
            self.leave(bid);
            return false;
         });
      }
   };

   $(document).one('ready.roster.jsxc', jsxc.muc.initMenu);

   $(document).one('attached.jsxc', jsxc.muc.init);

   $(document).one('connected.jsxc', function() {
      jsxc.storage.removeUserItem('roomNames');
      //@TODO clean up
   });

   $(document).on('init.window.jsxc', jsxc.muc.initWindow);
   $(document).on('presence.jsxc', jsxc.muc.onPresence);
   $(document).on('add.roster.jsxc', jsxc.muc.onAddRoster);
   