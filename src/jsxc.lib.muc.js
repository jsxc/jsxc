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
            <span class="jsxc_warning"></span> <a href="#" class="button jsxc_close" data-i18n="Close"></a> <a href="#" class="button creation jsxc_join" data-i18n="Join"></a>\
         </p>';

   jsxc.muc = {
      conn: null,

      init: function(o) {
         var self = jsxc.muc;
         self.conn = jsxc.xmpp.conn;
         
         var options = o || jsxc.options.get('muc');
         
         if (!options || typeof options.server !== 'string') {
            jsxc.debug('Discover muc service');
            
            // prosody does not response, if we send query before initial presence was send
            setTimeout(function() {
               self.conn.disco.items(Strophe.getDomainFromJid(self.conn.jid), null, function(items) {
                  $(items).find('item').each(function(){
                     var jid = $(this).attr('jid');
                     var discovered = false;
                     
                     self.conn.disco.info(jid, null, function(info) {
                        if ($(info).find('feature[var="' + Strophe.NS.MUC + '"]').length > 0) {
                           jsxc.debug('muc service found', jid);
                           
                           jsxc.options.set('muc', {
                              server: jid,
                              name: $(info).find('identity').attr('name')
                           });
                           
                           discovered = true;
                           
                           self.init();
                        }
                     });
                     
                     return !discovered;
                  });
               });
            }, 1000);
            
            return;
         }

         if (jsxc.gui.roster.ready) {
            self.initMenu();
         } else {
            $(document).one('ready.roster.jsxc', jsxc.muc.initMenu);
         }
         
         $(document).on('presence.jsxc', jsxc.muc.onPresence);
         $(document).on('error.presence.jsxc', jsxc.muc.onPresenceError);

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

         var error_handler = function(event, condition) {
            var msg;
            
            switch(condition) {
               case 'not-authorized': 
                  // password-protected room
                  msg = $.t('A_password_is_required');
                  break;
               case 'registration-required':
                  // members-only room
                  msg = $.t('You_are_not_on_the_member_list');
                  break;
               case 'forbidden':
                  // banned users
                  msg = $.t('You_are_banned_from_this_room');
                  break;
               case 'conflict':
                  // nickname conflict
                  msg = $.t('Your_desired_nickname_');
                  break;
               case 'service-unavailable':
                  // max users
                  msg = $.t('The_maximum_number_');
                  break;
               case 'item-not-found':
                  // locked or non-existing room
                  msg = $.t('This_room_is_locked_');
                  break;
               case 'not-allowed':
                  // room creation is restricted
                  msg = $.t('You_are_not_allowed_to_create_');
                  break;
               default:
                  jsxc.warn('Unknown muc error condition: ' + condition); 
                  msg = $.t('Error') + ': ' + condition;
            }

            dialog.find('.jsxc_warning').text(msg);
         };
         $(document).on('error.muc.jsxc', error_handler);
         
         $(document).on('close.dialog.jsxc', function(){
            $(document).off('error.muc.jsxc', error_handler);
         });
         
         // @TODO add spinning wheel
         self.conn.muc.listRooms(jsxc.options.get('muc').server, function(stanza){
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
               room += '@' + jsxc.options.get('muc').server;
            }

            if (jsxc.xmpp.conn.muc.roomNames.indexOf(room) < 0) {

               jsxc.storage.setUserItem('buddy', room, {
                  jid: room,
                  name: room,
                  sub: 'both',
                  type: 'groupchat'
               });
               
               jsxc.xmpp.conn.muc.join(room, nickname, null, null, null, password);
            } else {
               dialog.find('.jsxc_warning').text($.t('You_already_joined_this_room'));
            }
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
         var xdata = $(presence).find('x[xmlns^="' + Strophe.NS.MUC + '"]');
         
         if (self.conn.muc.roomNames.indexOf(room) < 0 || xdata.length === 0) {
            return true;
         }
         
         var res = Strophe.getResourceFromJid(from) || '';
         var nickname = Strophe.unescapeNode(res);
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (jsxc.gui.roster.getItem(room).length === 0) {
            // successfully joined
            jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);

            var bl = jsxc.storage.getUserItem('buddylist');
            bl.push(room);
            jsxc.storage.setUserItem('buddylist', bl);

            jsxc.gui.roster.add(room);

            jsxc.gui.window.open(room);
            jsxc.gui.dialog.close();
         }

         var jid = xdata.find('item').attr('jid') || null;

         var member = jsxc.storage.getUserItem('member', room) || {};

         if (status === 0) {
            delete member[nickname];

            self.removeMember(room, nickname);
            jsxc.gui.window.postMessage(room, 'sys', nickname + ' left the building.');
         } else {
            if (!member[nickname] && own[room]) {
               jsxc.gui.window.postMessage(room, 'sys', nickname + ' entered the room.');
            }

            member[nickname] = {
               jid: jid,
               status: status,
               roomJid: from,
               affiliation: xdata.find('item').attr('affiliation'),
               role: xdata.find('item').attr('role')
            };

            self.insertMember(room, nickname, jid, status);
         }

         jsxc.storage.setUserItem('member', room, member);

         xdata.find('status').each(function() {
            var code = $(this).attr('code');
            
            jsxc.debug('[muc][code]', code);
            
            if (typeof self.onStatus[code] === 'function') {
               self.onStatus[code].call(this, room, nickname);
            }
            
            $(document).trigger('status.muc.jsxc', [code, room, nickname, presence]);
         });
         
         return true;
      },
      onPresenceError: function(event, from, presence) {
         var self = jsxc.muc;   
         var xdata = $(presence).find('x[xmlns="' + Strophe.NS.MUC + '"]');
         var room = jsxc.jidToBid(from);

         if (xdata.length === 0 || self.conn.muc.roomNames.indexOf(room) < 0) {
            return true;
         }

         var error = $(presence).find('error');
         var condition = error.children()[0].tagName;
         
         jsxc.debug('[muc][error]', condition);
         
         $(document).trigger('error.muc.jsxc', [condition]);
      },
      onStatus: {
         /** Inform user that presence refers to itself */
         110: function(room, nickname) {
            var own = jsxc.storage.getUserItem('ownNicknames') || {};
            
            own[room] = nickname;
            jsxc.storage.setUserItem('ownNicknames', own);
         },
         /** Inform occupants that room logging is now enabled */
         170: function() {
            //@TODO warn the user that the discussions are logged
         },
         /** Inform user that a new room has been created */
         201: function(room) {
            //@TODO let user choose between instant and reserved room
            
            jsxc.muc.conn.muc.createInstantRoom(room);
         }
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
            } else {
               //@TODO display default avatar
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

   $(document).on('init.window.jsxc', jsxc.muc.initWindow);
   $(document).on('add.roster.jsxc', jsxc.muc.onAddRoster);
   
   $(document).one('attached.jsxc', function() {
      jsxc.muc.init();
   });

   $(document).one('connected.jsxc', function() {
      jsxc.storage.removeUserItem('roomNames');
      jsxc.storage.removeUserItem('ownNicknames');
      //@TODO clean up
   });