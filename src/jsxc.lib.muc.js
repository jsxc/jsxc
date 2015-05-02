jsxc.gui.template.joinChat = '<h3 data-i18n="Join_chat"></h3>\
         <p class=".jsxc_explanation" data-i18n="muc_explanation"></p>\
         <p><label for="jsxc_server" data-i18n="Server"></label>\
            <input type="text" name="server" id="jsxc_server" required="required" readonly="readonly" /></p>\
         <p><label for="jsxc_room" data-i18n="Room"></label>\
            <input type="text" name="room" id="jsxc_room" autocomplete="off" list="jsxc_roomlist" required="required" pattern="^[^\\x22&\'\\/:<>@\\s]+" /></p>\
         <p class="jsxc_inputinfo jsxc_waiting jsxc_room" data-i18n="Rooms_are_loaded"></p>\
         <datalist id="jsxc_roomlist">\
            <p><label for="jsxc_roomlist_select"></label><select id="jsxc_roomlist_select"><option></option><option>workaround</option></select></p>\
         </datalist>\
         <p><label for="jsxc_nickname" data-i18n="Nickname"></label>\
            <input type="text" name="nickname" id="jsxc_nickname" /></p>\
         <p><label for="jsxc_password" data-i18n="Password"></label>\
            <input type="text" name="password" id="jsxc_password" /></p>\
         <div class="jsxc_msg"></div>\
         <p class="jsxc_right">\
            <span class="jsxc_warning"></span> <a href="#" class="button jsxc_close" data-i18n="Close"></a> <a href="#" class="button jsxc_continue" data-i18n="Continue"> <a href="#" class="button jsxc_join" data-i18n="Join"></a>\
         </p>';

/**
 * Implements Multi-User Chat (XEP-0045).
 * 
 * @namespace jsxc.muc
 */
jsxc.muc = {
   /** strophe connection */
   conn: null,

   /** some constants */
   CONST: {
      AFFILIATION: {
         ADMIN: 'admin',
         MEMBER: 'member',
         OUTCAST: 'outcast',
         OWNER: 'owner',
         NONE: 'none'
      },
      ROLE: {
         MODERATOR: 'moderator',
         PARTICIPANT: 'participant',
         VISITOR: 'visitor',
         NONE: 'none'
      },
      ROOMSTATE: {
         INIT: 0,
         ENTERED: 1,
         EXITED: 2,
         AWAIT_DESTRUCTION: 3,
         DESTROYED: 4
      }
   },

   /**
    * Initialize muc plugin.
    * 
    * @private
    * @memberof jsxc.muc
    * @param {object} o Options
    */
   init: function(o) {
      var self = jsxc.muc;
      self.conn = jsxc.xmpp.conn;

      var options = o || jsxc.options.get('muc');

      if (!options || typeof options.server !== 'string') {
         jsxc.debug('Discover muc service');

         // prosody does not response, if we send query before initial presence was send
         setTimeout(function() {
            self.conn.disco.items(Strophe.getDomainFromJid(self.conn.jid), null, function(items) {
               $(items).find('item').each(function() {
                  var jid = $(this).attr('jid');
                  var discovered = false;

                  self.conn.disco.info(jid, null, function(info) {
                     var mucFeature = $(info).find('feature[var="' + Strophe.NS.MUC + '"]');
                     var mucIdentity = $(info).find('identity[category="conference"][type="text"]');

                     if (mucFeature.length > 0 && mucIdentity.length > 0) {
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
      self.conn.addHandler(self.onErrorMessage, null, 'message', 'error');
      self.conn.muc.roomNames = jsxc.storage.getUserItem('roomNames') || [];
   },

   /**
    * Add entry to menu.
    * 
    * @memberOf jsxc.muc
    */
   initMenu: function() {
      var li = $('<li>').attr('class', 'jsxc_joinChat').text($.t('Join_chat'));

      li.click(jsxc.muc.showJoinChat);

      $('#jsxc_menu ul').append(li);
   },

   /**
    * Open join dialog.
    * 
    * @memberOf jsxc.muc
    */
   showJoinChat: function() {
      var self = jsxc.muc;
      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('joinChat'));

      // hide second step button
      dialog.find('.jsxc_join').hide();

      // display conference server
      dialog.find('#jsxc_server').val(jsxc.options.get('muc').server);

      // handle error response
      var error_handler = function(event, condition, room) {
         var msg;

         switch (condition) {
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

         // clean up strophe.muc rooms
         var roomIndex = self.conn.muc.roomNames.indexOf(room);

         if (roomIndex > -1) {
            self.conn.muc.roomNames.splice(roomIndex, 1);
            delete self.conn.muc.rooms[room];
         }

         dialog.find('.jsxc_warning').text(msg);
      };

      $(document).on('error.muc.jsxc', error_handler);

      $(document).on('close.dialog.jsxc', function() {
         $(document).off('error.muc.jsxc', error_handler);
      });

      // load room list
      self.conn.muc.listRooms(jsxc.options.get('muc').server, function(stanza) {
         // workaround: chrome does not display dropdown arrow for dynamically filled datalists
         $('#jsxc_roomlist option:last').remove();

         $(stanza).find('item').each(function() {
            var r = $('<option>');
            var rjid = $(this).attr('jid').toLowerCase();
            var rnode = Strophe.getNodeFromJid(rjid);
            var rname = $(this).attr('name') || rnode;

            r.text(rname);
            r.attr('data-jid', rjid);
            r.attr('value', rnode);

            $('#jsxc_roomlist select').append(r);
         });

         var set = $(stanza).find('set[xmlns="http://jabber.org/protocol/rsm"]');

         if (set.length > 0) {
            var count = set.find('count').text() || '?';

            dialog.find('.jsxc_inputinfo').removeClass('jsxc_waiting').text($.t('Could_load_only', {
               count: count
            }));
         } else {
            dialog.find('.jsxc_inputinfo').hide();
         }
      }, function() {
         jsxc.warn('Could not load rooms');

         // room autocompletion is a comfort feature, so it is not necessary to inform the user
         dialog.find('.jsxc_inputinfo').hide();
      });

      dialog.find('#jsxc_nickname').attr('placeholder', Strophe.getNodeFromJid(self.conn.jid));

      dialog.find('.jsxc_continue').click(function(ev) {
         ev.preventDefault();

         var room = ($('#jsxc_room').val()) ? jsxc.jidToBid($('#jsxc_room').val()) : null;
         var nickname = $('#jsxc_nickname').val() || Strophe.getNodeFromJid(self.conn.jid);
         var password = $('#jsxc_password').val() || null;

         if (!room || !room.match(/^[^"&\'\/:<>@\s]+$/i)) {
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
            // not already joined

            var discoReceived = function(roomName, subject) {
               // we received the room information

               jsxc.gui.dialog.resize();

               dialog.find('.jsxc_continue').hide();

               dialog.find('.jsxc_join').show().effect('highlight', {
                  color: 'green'
               }, 4000);

               dialog.find('.jsxc_join').click(function(ev) {
                  ev.preventDefault();

                  self.join(room, nickname, password, roomName, subject);

                  return false;
               });
            };

            dialog.find('.jsxc_msg').append($('<p>').text($.t('Loading_room_information')).addClass('jsxc_waiting'));
            jsxc.gui.dialog.resize();

            self.conn.disco.info(room, null, function(stanza) {
               dialog.find('.jsxc_msg').html('<p>' + $.t('This_room_is') + '</p>');

               var table = $('<table>');

               $(stanza).find('feature').each(function() {
                  var feature = $(this).attr('var');

                  if (feature !== '' && i18n.exists(feature)) {
                     var tr = $('<tr>');
                     $('<td>').text($.t(feature + '.keyword')).appendTo(tr);
                     $('<td>').text($.t(feature + '.description')).appendTo(tr);
                     tr.appendTo(table);
                  }
               });

               dialog.find('.jsxc_msg').append(table);

               var roomName = $(stanza).find('identity').attr('name');
               var subject = $(stanza).find('field[var="muc#roominfo_subject"]').attr('label');

               //@TODO display subject, number of occupants, etc.

               discoReceived(roomName, subject);
            }, function() {
               dialog.find('.jsxc_msg').empty();
               $('<p>').text($.t('Room_not_found_')).appendTo(dialog.find('.jsxc_msg'));

               discoReceived();
            });
         } else {
            dialog.find('.jsxc_warning').text($.t('You_already_joined_this_room'));
         }

         return false;
      });

      dialog.find('input').keydown(function(ev) {

         if (ev.which !== 13) {
            // reset messages and room information

            dialog.find('.jsxc_warning').empty();

            if (dialog.find('.jsxc_continue').is(":hidden")) {
               dialog.find('.jsxc_continue').show();
               dialog.find('.jsxc_join').hide().off('click');
               dialog.find('.jsxc_msg').empty();
               jsxc.gui.dialog.resize();
            }

            return;
         }

         if (!dialog.find('.jsxc_continue').is(":hidden")) {
            dialog.find('.jsxc_continue').click();
         } else {
            dialog.find('.jsxc_join').click();
         }
      });
   },

   /**
    * Join the given room.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {string} nickname Desired nickname
    * @param {string} [password] Password
    * @param {string} [roomName] Room alias
    * @param {string} [subject] Current subject
    */
   join: function(room, nickname, password, roomName, subject) {
      var self = jsxc.muc;

      jsxc.storage.setUserItem('buddy', room, {
         jid: room,
         name: roomName || room,
         sub: 'both',
         type: 'groupchat',
         state: self.CONST.ROOMSTATE.INIT,
         subject: subject
      });

      jsxc.xmpp.conn.muc.join(room, nickname, null, null, null, password);
   },

   /**
    * Leave given room.
    * 
    * @memberOf jsxc.muc 
    * @param {string} room Room jid
    */
   leave: function(room) {
      var self = jsxc.muc;
      var own = jsxc.storage.getUserItem('ownNicknames') || {};
      var data = jsxc.storage.getUserItem('buddy', room) || {};

      if (data.state === self.CONST.ROOMSTATE.ENTERED) {
         self.conn.muc.leave(room, own[room], function() {
            self.onExited(room);
         });
      } else {
         self.onExited(room);
      }
   },

   /**
    * Clean up after we exited a room.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    */
   onExited: function(room) {
      var self = jsxc.muc;
      var own = jsxc.storage.getUserItem('ownNicknames') || {};

      jsxc.storage.setUserItem('roomNames', self.conn.muc.roomNames);

      delete own[room];
      jsxc.storage.setUserItem('ownNicknames', own);
      jsxc.storage.removeUserItem('member', room);
      jsxc.storage.removeUserItem('chat', room);

      jsxc.gui.window.close(room);
      jsxc.gui.roster.purge(room);
   },

   /**
    * Destroy the given room.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {function} handler_cb Function to handle the successful destruction
    * @param {function} error_cb Function to handle an error
    */
   destroy: function(room, handler_cb, error_cb) {
      var self = jsxc.muc;

      jsxc.storage.updateUserItem('buddy', room, 'state', self.CONST.ROOMSTATE.AWAIT_DESTRUCTION);
      jsxc.gui.window.postMessage(room, 'sys', $.t('This_room_will_be_closed'));

      var iq = $iq({
         to: room,
         type: "set"
      }).c("query", {
         xmlns: Strophe.NS.MUC_OWNER
      }).c("destroy");

      jsxc.muc.conn.sendIQ(iq.tree(), handler_cb, error_cb);
   },

   /**
    * Close the given room. 
    * 
    * @memberOf jsxc.muc
    * @param room Room jid
    */
   close: function(room) {
      var self = jsxc.muc;
      var roomdata = jsxc.storage.getUserItem('buddy', room) || {};

      self.emptyMembers(room);

      var roomIndex = self.conn.muc.roomNames.indexOf(room);

      if (roomIndex > -1) {
         self.conn.muc.roomNames.splice(roomIndex, 1);
         delete self.conn.muc.rooms[room];
      }

      jsxc.storage.setUserItem('roomNames', self.conn.muc.roomNames);

      if (roomdata.state === self.CONST.ROOMSTATE.AWAIT_DESTRUCTION) {
         self.onExited(room);
      }

      roomdata.state = self.CONST.ROOMSTATE.DESTROYED;

      jsxc.storage.setUserItem('buddy', room, roomdata);
   },

   /**
    * Init group chat window.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param event Event
    * @param {jQuery} win Window object
    */
   initWindow: function(event, win) {
      var self = jsxc.muc;
      var data = win.data();
      var bid = jsxc.jidToBid(data.jid);
      var roomdata = jsxc.storage.getUserItem('buddy', bid);

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

      var own = jsxc.storage.getUserItem('ownNicknames') || {};
      var ownNickname = own[bid];
      var mlIcon = $('<div class="jsxc_members"></div>');

      win.find('.jsxc_tools > .jsxc_transfer').after(mlIcon);

      var ml = $('<div class="jsxc_memberlist"><ul></ul></div>');
      win.find('.jsxc_fade').prepend(ml);

      ml.on('wheel', function(ev) {
         jsxc.muc.scrollMemberListBy(bid, (ev.originalEvent.wheelDelta > 0) ? 50 : -50);
      });

      // toggle member list
      var toggleMl = function(ev) {
         if (ev) {
            ev.preventDefault();
         }

         var slimOptions = {};
         var ul = ml.find('ul:first');
         var slimHeight = null;

         ml.toggleClass('jsxc_expand');

         if (ml.hasClass('jsxc_expand')) {
            $('body').click();
            $('body').one('click', toggleMl);

            ul.mouseleave(function() {
               ul.data('timer', window.setTimeout(toggleMl, 2000));
            }).mouseenter(function() {
               window.clearTimeout(ul.data('timer'));
            }).css('left', '0px');

            var maxHeight = win.find(".jsxc_textarea").height() * 0.8;
            var innerHeight = ml.find('ul').height() + 3;
            slimHeight = (innerHeight > maxHeight) ? maxHeight : innerHeight;

            slimOptions = {
               distance: '3px',
               height: slimHeight + 'px',
               width: '100%',
               color: '#fff',
               opacity: '0.5'
            };

            ml.css('height', slimHeight + 'px');
         } else {
            slimOptions = {
               destroy: true
            };

            ul.attr('style', '');
            ml.css('height', '');

            window.clearTimeout(ul.data('timer'));
            $('body').off('click', null, toggleMl);
            ul.off('mouseleave mouseenter');
         }

         ul.slimscroll(slimOptions);

         return false;
      };

      mlIcon.click(toggleMl);

      win.on('resize', function() {
         // update member list position
         jsxc.muc.scrollMemberListBy(bid, 0);
      });

      // update emoticon button
      setTimeout(function() {
         var top = win.find('.jsxc_emoticons').position().top + win.find('.slimScrollDiv').position().top;
         win.find('.jsxc_emoticons').css('top', top + 'px');
      }, 400);

      var destroy = $('<li>');
      destroy.text($.t('Destroy'));
      destroy.addClass('jsxc_destroy');
      destroy.hide();
      destroy.click(function() {
         self.destroy(bid);
      });

      win.find('.jsxc_settings ul').append(destroy);

      if (roomdata.state > self.CONST.ROOMSTATE.INIT) {
         var member = jsxc.storage.getUserItem('member', bid) || {};

         $.each(member, function(nickname, val) {
            self.insertMember(bid, nickname, val);

            if (nickname === ownNickname && val.affiliation === self.CONST.AFFILIATION.OWNER) {
               destroy.show();
            }
         });
      }

      var leave = $('<li>');
      leave.text($.t('Leave'));
      leave.addClass('jsxc_leave');
      leave.click(function() {
         self.leave(bid);
      });

      win.find('.jsxc_settings ul').append(leave);
   },

   /**
    * Triggered on incoming presence stanzas.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param event
    * @param {string} from Jid
    * @param {integer} status Online status between 0 and 5
    * @param {string} presence Presence stanza
    */
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
      var member = jsxc.storage.getUserItem('member', room) || {};
      var codes = [];

      xdata.find('status').each(function() {
         var code = $(this).attr('code');

         jsxc.debug('[muc][code]', code);

         codes.push(code);
      });

      if (jsxc.gui.roster.getItem(room).length === 0) {
         // successfully joined

         jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);

         // clean up
         jsxc.storage.removeUserItem('chat', room);
         member = {};

         var bl = jsxc.storage.getUserItem('buddylist');
         bl.push(room);
         jsxc.storage.setUserItem('buddylist', bl);

         jsxc.gui.roster.add(room);

         jsxc.gui.window.open(room);
         jsxc.gui.dialog.close();
      }

      var jid = xdata.find('item').attr('jid') || null;

      if (status === 0) {
         if (xdata.find('destroy').length > 0) {
            // room has been destroyed
            member = {};

            jsxc.gui.window.postMessage(room, 'sys', $.t('This_room_has_been_closed'));

            self.close(room);
         } else {
            delete member[nickname];

            self.removeMember(room, nickname);

            var newNickname = xdata.find('item').attr('nick');

            if (codes.indexOf('303') > -1 && newNickname) {
               // user changed his nickname

               newNickname = Strophe.unescapeNode(newNickname);

               // prevent to display enter message
               member[newNickname] = {};

               jsxc.gui.window.postMessage(room, 'sys', $.t('is_now_known_as', {
                  oldNickname: nickname,
                  newNickname: newNickname,
                  escapeInterpolation: true
               }));
            } else if (codes.length === 0 || (codes.length === 1 && codes.indexOf('110') > -1)) {
               // normal user exit
               jsxc.gui.window.postMessage(room, 'sys', $.t('left_the_building', {
                  nickname: nickname,
                  escapeInterpolation: true
               }));
            }
         }
      } else {
         // new member joined

         if (!member[nickname] && own[room]) {
            jsxc.gui.window.postMessage(room, 'sys', $.t('entered_the_room', {
               nickname: nickname,
               escapeInterpolation: true
            }));
         }

         member[nickname] = {
            jid: jid,
            status: status,
            roomJid: from,
            affiliation: xdata.find('item').attr('affiliation'),
            role: xdata.find('item').attr('role')
         };

         self.insertMember(room, nickname, member[nickname]);
      }

      jsxc.storage.setUserItem('member', room, member);

      $.each(codes, function(index, code) {
         // call code functions and trigger event

         if (typeof self.onStatus[code] === 'function') {
            self.onStatus[code].call(this, room, nickname, member[nickname] || {}, xdata);
         }

         $(document).trigger('status.muc.jsxc', [code, room, nickname, member[nickname] || {}, presence]);
      });

      return true;
   },

   /**
    * Handle group chat presence errors.
    * 
    * @memberOf jsxc.muc
    * @param event
    * @param {string} from Jid
    * @param {string} presence Presence stanza
    * @returns {Boolean} Returns true on success
    */
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

      $(document).trigger('error.muc.jsxc', [condition, room]);

      return true;
   },

   /**
    * Handle status codes. Every function gets room jid, nickname, member data and xdata.
    * 
    * @memberOf jsxc.muc
    */
   onStatus: {
      /** Inform user that presence refers to itself */
      110: function(room, nickname, data) {
         var self = jsxc.muc;
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         own[room] = nickname;
         jsxc.storage.setUserItem('ownNicknames', own);

         if (data.affiliation === self.CONST.AFFILIATION.OWNER) {
            jsxc.gui.window.get(room).find('.jsxc_destroy').show();
         }

         var roomdata = jsxc.storage.getUserItem('buddy', room);

         if (roomdata.state === self.CONST.ROOMSTATE.INIT) {
            roomdata.state = self.CONST.ROOMSTATE.ENTERED;

            jsxc.storage.setUserItem('buddy', room, roomdata);
         }
      },
      /** Inform occupants that room logging is now enabled */
      170: function(room) {
         jsxc.gui.window.postMessage(room, 'sys', $.t('Room_logging_is_enabled'));
      },
      /** Inform user that a new room has been created */
      201: function(room) {
         var self = jsxc.muc;
         //@TODO let user choose between instant and reserved room

         self.conn.muc.createInstantRoom(room);
      },
      /** Inform user that he or she has been banned */
      301: function(room, nickname, data, xdata) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_banned'));

            jsxc.muc.postReason(room, xdata);
         } else {
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_info_banned', {
               nickname: nickname,
               escapeInterpolation: true
            }));
         }
      },
      /** Inform user that he or she has been kicked */
      307: function(room, nickname, data, xdata) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_kicked'));

            jsxc.muc.postReason(room, xdata);
         } else {
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_info_kicked', {
               nickname: nickname,
               escapeInterpolation: true
            }));
         }
      },
      /** Inform user that he or she is beeing removed from the room because of an affiliation change */
      321: function(room, nickname) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_affiliation'));
         } else {
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_info_affiliation', {
               nickname: nickname,
               escapeInterpolation: true
            }));
         }
      },
      /** 
       * Inform user that he or she is beeing removed from the room because the room has been 
       * changed to members-only and the user is not a member
       */
      322: function(room, nickname) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_membersonly'));
         } else {
            jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_info_membersonly', {
               nickname: nickname,
               escapeInterpolation: true
            }));
         }
      },
      /**
       * Inform user that he or she is beeing removed from the room because the MUC service
       * is being shut down 
       */
      332: function(room) {
         jsxc.muc.close(room);
         jsxc.gui.window.postMessage(room, 'sys', $.t('muc_removed_shutdown'));
      }
   },

   /**
    * Extract reason from xdata and if available post it to room.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {jQuery} xdata Xdata
    */
   postReason: function(room, xdata) {
      var actor = {
         name: xdata.find('actor').attr('nick'),
         jid: xdata.find('actor').attr('jid')
      };
      var reason = xdata.find('reason').text();

      if (reason !== '') {
         reason = $.t('Reason') + ': ' + reason;

         if (typeof actor.name === 'string' || typeof actor.jid === 'string') {
            jsxc.gui.window.postMessage(room, 'in', reason, false, false, null, actor);
         } else {
            jsxc.gui.window.postMessage(room, 'sys', reason);
         }
      }
   },

   /**
    * Insert member to room member list.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {string} nickname Nickname
    * @param {string} memberdata Member data
    */
   insertMember: function(room, nickname, memberdata) {
      var self = jsxc.muc;
      var win = jsxc.gui.window.get(room);
      var jid = memberdata.jid;
      var m = win.find('.jsxc_memberlist li[data-nickname="' + nickname + '"]');

      if (m.length === 0) {
         var title = jsxc.escapeHTML(nickname);

         m = $('<li><div class="jsxc_avatar"></div><div class="jsxc_name"/></li>');
         m.attr('data-nickname', nickname);

         win.find('.jsxc_memberlist ul').append(m);

         if (typeof jid === 'string') {
            m.find('.jsxc_name').text(jsxc.jidToBid(jid));
            m.attr('data-bid', jsxc.jidToBid(jid));
            title = title + '\n' + jsxc.jidToBid(jid);

            var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(jid));

            if (data !== null && typeof data === 'object') {
               jsxc.gui.updateAvatar(m, jsxc.jidToBid(jid), data.avatar);
            } else if (jsxc.jidToBid(jid) === jsxc.jidToBid(self.conn.jid)) {
               jsxc.gui.updateAvatar(m, jsxc.jidToBid(jid), 'own');
            }
         } else {
            m.find('.jsxc_name').text(nickname);

            jsxc.gui.avatarPlaceholder(m.find('.jsxc_avatar'), nickname);
         }

         m.attr('title', title);
      }
   },

   /**
    * Remove member from room member list.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {string} nickname Nickname
    */
   removeMember: function(room, nickname) {
      var win = jsxc.gui.window.get(room);
      var m = win.find('.jsxc_memberlist li[data-nickname="' + nickname + '"]');

      if (m.length > 0) {
         m.remove();
      }
   },

   /**
    * Scroll or update member list position.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    * @param {integer} offset =0: update position; >0: Scroll to left; <0: Scroll to right
    */
   scrollMemberListBy: function(room, offset) {
      var win = jsxc.gui.window.get(room);

      if (win.find('.jsxc_memberlist').hasClass('jsxc_expand')) {
         return;
      }

      var el = win.find('.jsxc_memberlist ul:first');
      var scrollWidth = el.width();
      var width = win.find('.jsxc_memberlist').width();
      var left = parseInt(el.css('left'));

      left = (isNaN(left)) ? 0 - offset : left - offset;

      if (scrollWidth < width || left > 0) {
         left = 0;
      } else if (left < width - scrollWidth) {
         left = width - scrollWidth;
      }

      el.css('left', left + 'px');
   },

   /**
    * Empty member list.
    * 
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    */
   emptyMembers: function(room) {
      var win = jsxc.gui.window.get(room);

      win.find('.jsxc_memberlist').empty();

      jsxc.storage.setUserItem('member', room, {});
   },

   /**
    * Handle incoming group chat message.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param {string} message Message stanza
    * @returns {boolean} True on success
    */
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

      if (body !== '') {
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
      }

      var subject = $(message).find('subject');

      if (subject.length > 0) {
         var roomdata = jsxc.storage.getUserItem('buddy', room);

         roomdata.subject = subject.text();

         jsxc.storage.setUserItem('buddy', room, roomdata);

         jsxc.gui.window.postMessage(room, 'sys', $.t('changed_subject_to', {
            nickname: nickname,
            subject: subject.text()
         }));
      }

      return true;
   },

   /**
    * Handle group chat error message.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param {string} message Message stanza
    */
   onErrorMessage: function(message) {
      var room = jsxc.jidToBid($(message).attr('from'));

      if (jsxc.gui.window.get(room).length === 0) {
         return true;
      }

      if ($(message).find('item-not-found').length > 0) {
         jsxc.gui.window.postMessage(room, 'sys', $.t('message_not_send_item-not-found'));
      } else if ($(message).find('forbidden').length > 0) {
         jsxc.gui.window.postMessage(room, 'sys', $.t('message_not_send_forbidden'));
      } else if ($(message).find('not-acceptable').length > 0) {
         jsxc.gui.window.postMessage(room, 'sys', $.t('message_not_send_not-acceptable'));
      } else {
         jsxc.gui.window.postMessage(room, 'sys', $.t('message_not_send'));
      }

      jsxc.debug('[muc] error message for ' + room, $(message).find('error')[0]);

      return true;
   },

   /**
    * Prepare group chat roster item.
    * 
    * @private
    * @memberOf jsxc.muc
    * @param event
    * @param {string} room Room jid
    * @param {object} data Room data
    * @param {jQuery} bud Roster item
    */
   onAddRoster: function(event, room, data, bud) {
      var self = jsxc.muc;

      if (data.type !== 'groupchat') {
         return;
      }

      bud.find('.jsxc_delete').off('click').click(function() {
         self.leave(room);
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
});
