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
      },
      ROOMCONFIG: {
         INSTANT: 'instant'
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

         // prosody does not respond, if we send query before initial presence was sent
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

      // remove maybe previously attached handlers
      $(document).off('presence.jsxc', jsxc.muc.onPresence);
      $(document).off('error.presence.jsxc', jsxc.muc.onPresenceError);

      $(document).on('presence.jsxc', jsxc.muc.onPresence);
      $(document).on('error.presence.jsxc', jsxc.muc.onPresenceError);

      self.conn.addHandler(self.onGroupchatMessage, null, 'message', 'groupchat');
      self.conn.muc.roomNames = jsxc.storage.getUserItem('roomNames') || [];
   },

   /**
    * Add entry to menu.
    *
    * @memberOf jsxc.muc
    */
   initMenu: function() {
      var li = $('<li>').attr('class', 'jsxc_joinChat jsxc_groupcontacticon').text($.t('Join_chat'));

      li.click(jsxc.muc.showJoinChat);

      if ($('#jsxc_menu .jsxc_joinChat').length === 0) {
         $('#jsxc_menu ul .jsxc_about').before(li);
      }
   },

   /**
    * Open join dialog.
    *
    * @memberOf jsxc.muc
    * @param {string} [r] - room jid
    * @param {string} [p] - room password
    */
   showJoinChat: function(r, p) {
      var self = jsxc.muc;
      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('joinChat'));

      // @TODO split this monster function apart

      // hide second step button
      dialog.find('.jsxc_join').hide();

      // prepopulate room jid
      if (typeof r === 'string') {
         dialog.find('#jsxc_room').val(r);
      }

      // prepopulate room password
      if (typeof p === 'string') {
         dialog.find('#jsxc_password').val(p);
      }

      // display conference server
      var serverInputTimeout;
      dialog.find('#jsxc_server').val(jsxc.options.get('muc').server);
      dialog.find('#jsxc_server').on('input', function() {
         var self = $(this);

         if (serverInputTimeout) {
            clearTimeout(serverInputTimeout);
            dialog.find('.jsxc_inputinfo.jsxc_room').hide();
         }

         dialog.find('.jsxc_inputinfo.jsxc_server').hide().text('');
         dialog.find('#jsxc_server').removeClass('jsxc_invalid');

         if (self.val() && self.val().match(/^[.-0-9a-zA-Z]+$/i)) {
            dialog.find('.jsxc_inputinfo.jsxc_room').show().addClass('jsxc_waiting');

            serverInputTimeout = setTimeout(function() {
               loadRoomList(self.val());
            }, 1800);
         }
      }).trigger('input');

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

         $('<p>').addClass('jsxc_warning').text(msg).appendTo(dialog.find('.jsxc_msg'));
      };

      $(document).on('error.muc.jsxc', error_handler);

      $(document).on('close.dialog.jsxc', function() {
         $(document).off('error.muc.jsxc', error_handler);
      });

      dialog.find('#jsxc_nickname').attr('placeholder', Strophe.getNodeFromJid(self.conn.jid));

      dialog.find('#jsxc_bookmark').change(function() {
         if ($(this).prop('checked')) {
            $('#jsxc_autojoin').prop('disabled', false);
            $('#jsxc_autojoin').parent('.checkbox').removeClass('disabled');
         } else {
            $('#jsxc_autojoin').prop('disabled', true).prop('checked', false);
            $('#jsxc_autojoin').parent('.checkbox').addClass('disabled');
         }
      });

      dialog.find('.jsxc_continue').click(function(ev) {
         ev.preventDefault();

         var room = ($('#jsxc_room').val()) ? jsxc.jidToBid($('#jsxc_room').val()) : null;
         var nickname = $('#jsxc_nickname').val() || Strophe.getNodeFromJid(self.conn.jid);
         var server = dialog.find('#jsxc_server').val();

         if (!room || !room.match(/^[^"&\'\/:<>@\s]+$/i)) {
            $('#jsxc_room').addClass('jsxc_invalid').keyup(function() {
               if ($(this).val()) {
                  $(this).removeClass('jsxc_invalid');
               }
            });
            return false;
         }

         if (dialog.find('#jsxc_server').hasClass('jsxc_invalid')) {
            return false;
         }

         if (!room.match(/@(.*)$/)) {
            room += '@' + server;
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

                  var bookmark = $("#jsxc_bookmark").prop("checked");
                  var autojoin = $('#jsxc_autojoin').prop('checked');
                  var password = $('#jsxc_password').val() || null;

                  // clean up
                  jsxc.gui.window.clear(room);
                  jsxc.storage.setUserItem('member', room, {});

                  self.join(room, nickname, password, roomName, subject, bookmark, autojoin);

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

                  if (feature !== '' && i18next.exists(feature)) {
                     var tr = $('<tr>');
                     $('<td>').text($.t(feature + '.keyword')).appendTo(tr);
                     $('<td>').text($.t(feature + '.description')).appendTo(tr);
                     tr.appendTo(table);
                  }

                  if (feature === 'muc_passwordprotected') {
                     dialog.find('#jsxc_password').parents('.form-group').removeClass('jsxc_hidden');
                     dialog.find('#jsxc_password').attr('required', 'required');
                     dialog.find('#jsxc_password').addClass('jsxc_invalid');
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
            $('<p>').addClass('jsxc_warning').text($.t('You_already_joined_this_room')).appendTo(dialog.find('.jsxc_msg'));
         }

         return false;
      });

      dialog.find('input').keydown(function(ev) {

         if (ev.which !== 13) {
            // reset messages and room information

            dialog.find('.jsxc_warning').remove();

            if (dialog.find('.jsxc_continue').is(":hidden") && $(this).attr('id') !== 'jsxc_password') {
               dialog.find('.jsxc_continue').show();
               dialog.find('.jsxc_join').hide().off('click');
               dialog.find('.jsxc_msg').empty();
               dialog.find('#jsxc_password').parents('.form-group').addClass('jsxc_hidden');
               dialog.find('#jsxc_password').attr('required', '');
               dialog.find('#jsxc_password').removeClass('jsxc_invalid');
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

      function loadRoomList(server) {
         if (!server) {
            dialog.find('.jsxc_inputinfo').hide();

            return;
         }

         // load room list
         self.conn.muc.listRooms(server, function(stanza) {
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

               dialog.find('.jsxc_inputinfo').show().removeClass('jsxc_waiting').text($.t('Could_load_only', {
                  count: count
               }));
            } else {
               dialog.find('.jsxc_inputinfo').hide();
            }
         }, function(stanza) {
            var errTextMsg = $(stanza).find('error text').text() || null;
            jsxc.warn('Could not load rooms', errTextMsg);

            if (errTextMsg) {
               dialog.find('.jsxc_inputinfo.jsxc_server').show().text(errTextMsg);
            }

            if ($(stanza).find('error remote-server-not-found')) {
               dialog.find('#jsxc_server').addClass('jsxc_invalid');
            }

            dialog.find('.jsxc_inputinfo.jsxc_room').hide();
         });
      }
   },

   /**
    * Request and show room configuration.
    *
    * @memberOf jsxc.muc
    * @param  {string} room - room jid
    */
   showRoomConfiguration: function(room) {
      var self = jsxc.muc;

      self.conn.muc.configure(room, function(stanza) {

         var form = Strophe.x.Form.fromXML(stanza);

         window.f = form;
         self._showRoomConfiguration(room, form);
      }, function() {
         jsxc.debug('Could not load room configuration');

         //@TODO show error
      });
   },

   /**
    * Show room configuration.
    *
    * @private
    * @memberOf jsxc.muc
    * @param  {string} room - room jid
    * @param  {Strophe.x.Form} config - current room config as Form object
    */
   _showRoomConfiguration: function(room, config) {
      var self = jsxc.muc;
      var dialog = jsxc.gui.dialog.open(jsxc.muc.helper.formToHTML(config));
      var form = dialog.find('form');

      // work around Strophe.x behaviour
      form.find('[type="checkbox"]').change(function() {
         $(this).val(this.checked ? 1 : 0);
      });

      var submit = $('<button>');
      submit.addClass('btn btn-primary');
      submit.attr('type', 'submit');
      submit.text($.t('Save'));

      var cancel = $('<button>');
      cancel.addClass('btn btn-default');
      cancel.attr('type', 'button');
      cancel.text($.t('Cancel'));

      var formGroup = $('<div>');
      formGroup.addClass('form-group');
      $('<div>').addClass('col-sm-offset-6 col-sm-6').appendTo(formGroup);
      formGroup.find('>div').append(cancel);
      formGroup.find('>div').append(submit);

      form.append(formGroup);

      form.submit(function(ev) {
         ev.preventDefault();

         var config = Strophe.x.Form.fromHTML(form.get(0));
         self.conn.muc.saveConfiguration(room, config, function() {
            jsxc.storage.updateUserItem('buddy', room, 'config', config);

            jsxc.debug('Room configuration saved.');
         }, function() {
            jsxc.warn('Could not save room configuration.');

            //@TODO display error
         });

         jsxc.gui.dialog.close();

         return false;
      });

      cancel.click(function() {
         self.conn.muc.cancelConfigure(room);

         jsxc.gui.dialog.close();
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
   join: function(room, nickname, password, roomName, subject, bookmark, autojoin) {
      var self = jsxc.muc;

      jsxc.storage.setUserItem('buddy', room, {
         jid: room,
         name: roomName || room,
         sub: 'both',
         type: 'groupchat',
         state: self.CONST.ROOMSTATE.INIT,
         subject: subject,
         bookmarked: bookmark || false,
         autojoin: autojoin || false,
         nickname: nickname,
         config: null
      });

      jsxc.xmpp.conn.muc.join(room, nickname, null, null, null, password);

      if (bookmark) {
         jsxc.xmpp.bookmarks.add(room, roomName, nickname, autojoin);
      }
   },

   /**
    * Leave given room.
    *
    * @memberOf jsxc.muc
    * @param {string} room Room jid
    */
   leave: function(room) {
      if (!jsxc.master) {
         jsxc.tab.execMaster('muc.leave', room);
         return;
      }

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
      var roomdata = jsxc.storage.getUserItem('buddy', room) || {};

      jsxc.storage.setUserItem('roomNames', self.conn.muc.roomNames);

      delete own[room];
      jsxc.storage.setUserItem('ownNicknames', own);
      jsxc.storage.removeUserItem('member', room);
      jsxc.storage.removeUserItem('chat', room);

      jsxc.gui.window.close(room);

      jsxc.storage.updateUserItem('buddy', room, 'state', self.CONST.ROOMSTATE.EXITED);

      if (!roomdata.bookmarked) {
         jsxc.gui.roster.purge(room);
      }
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
      if (!jsxc.master) {
         jsxc.tab.execMaster('muc.destroy', room);
         return;
      }

      var self = jsxc.muc;
      var roomdata = jsxc.storage.getUserItem('buddy', room);

      jsxc.storage.updateUserItem('buddy', room, 'state', self.CONST.ROOMSTATE.AWAIT_DESTRUCTION);
      jsxc.gui.window.postMessage({
         bid: room,
         direction: jsxc.Message.SYS,
         msg: $.t('This_room_will_be_closed')
      });

      var iq = $iq({
         to: room,
         type: "set"
      }).c("query", {
         xmlns: Strophe.NS.MUC_OWNER
      }).c("destroy");

      jsxc.muc.conn.sendIQ(iq.tree(), handler_cb, error_cb);

      if (roomdata.bookmarked) {
         jsxc.xmpp.bookmarks.delete(room);
      }
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

      if (jsxc.storage.getUserItem('budy', room)) {
         roomdata.state = self.CONST.ROOMSTATE.DESTROYED;

         jsxc.storage.setUserItem('buddy', room, roomdata);
      }
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

      if (!jsxc.xmpp.conn && jsxc.master) {
         $(document).one('attached.jsxc', function() {
            self.initWindow(null, win);
         });
         return;
      }

      var data = win.data();
      var bid = jsxc.jidToBid(data.jid);
      var roomdata = jsxc.storage.getUserItem('buddy', bid);

      if (roomdata.type !== 'groupchat') {
         return;
      }

      win.addClass('jsxc_groupchat');

      var own = jsxc.storage.getUserItem('ownNicknames') || {};
      var ownNickname = own[bid];
      var mlIcon = $('<div class="jsxc_members"></div>');

      win.find('.jsxc_tools > .jsxc_settings').after(mlIcon);

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

      var destroy = $('<a>');
      destroy.attr('href', '#');
      destroy.text($.t('Destroy'));
      destroy.addClass('jsxc_destroy');
      destroy.hide();
      destroy.click(function() {
         self.destroy(bid);
      });

      win.find('.jsxc_settings ul').append($('<li>').append(destroy));

      var configure = $('<a>');
      configure.attr('href', '#');
      configure.text($.t('Configure'));
      configure.addClass('jsxc_configure');
      configure.hide();
      configure.click(function() {
         self.showRoomConfiguration(bid);
      });

      if (self.conn) {
         win.find('.jsxc_settings ul').append($('<li>').append(configure));
      }

      if (roomdata.state > self.CONST.ROOMSTATE.INIT) {
         var member = jsxc.storage.getUserItem('member', bid) || {};

         $.each(member, function(nickname, val) {
            self.insertMember(bid, nickname, val);

            if (nickname === ownNickname && val.affiliation === self.CONST.AFFILIATION.OWNER) {
               destroy.show();
            }

            if (nickname === ownNickname && (val.affiliation === self.CONST.AFFILIATION.OWNER || val.affiliation === self.CONST.AFFILIATION.OWNER)) {
               configure.show();
            }
         });
      }

      var leave = $('<a>');
      leave.attr('href', '#');
      leave.text($.t('Leave'));
      leave.addClass('jsxc_leave');
      leave.click(function() {
         self.leave(bid);
      });

      win.find('.jsxc_settings ul').append($('<li>').append(leave));
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
      var roomdata = jsxc.storage.getUserItem('buddy', room);
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

      if (roomdata.state === self.CONST.ROOMSTATE.INIT) {
         // successfully joined

         roomdata.status = jsxc.CONST.STATUS.indexOf('online');
         jsxc.storage.setUserItem('buddy', room, roomdata);

         jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);

         if (jsxc.gui.roster.getItem(room).length === 0) {
            var bl = jsxc.storage.getUserItem('buddylist');
            bl.push(room);
            jsxc.storage.setUserItem('buddylist', bl);

            jsxc.gui.roster.add(room);
         }

         if ($('#jsxc_dialog').length > 0) {
            // User joined the room manually
            jsxc.gui.dialog.close();

            jsxc.gui.window.open(room);
         }
      }

      var jid = xdata.find('item').attr('jid') || null;

      if (status === 0) {
         if (xdata.find('destroy').length > 0) {
            // room has been destroyed
            member = {};

            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('This_room_has_been_closed')
            });

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

               jsxc.gui.window.postMessage({
                  bid: room,
                  direction: jsxc.Message.SYS,
                  msg: $.t('is_now_known_as', {
                     oldNickname: nickname,
                     newNickname: newNickname,
                     escapeInterpolation: true
                  })
               });
            } else if (codes.length === 0 || (codes.length === 1 && codes.indexOf('110') > -1)) {
               // normal user exit
               jsxc.gui.window.postMessage({
                  bid: room,
                  direction: jsxc.Message.SYS,
                  msg: $.t('left_the_building', {
                     nickname: nickname,
                     escapeInterpolation: true
                  })
               });
            }
         }
      } else {
         // new member joined

         if (!member[nickname] && own[room]) {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('entered_the_room', {
                  nickname: nickname,
                  escapeInterpolation: true
               })
            });
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
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('Room_logging_is_enabled')
         });
      },
      /** Inform occupants that room logging is now disabled */
      171: function(room) {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('Room_logging_is_disabled')
         });
      },
      /** Inform occupants that the room is now non-anonymous */
      172: function(room) {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('Room_is_now_non-anoymous')
         });
      },
      /** Inform occupants that the room is now semi-anonymous */
      173: function(room) {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('Room_is_now_semi-anonymous')
         });
      },
      /** Inform user that a new room has been created */
      201: function(room) {
         var self = jsxc.muc;
         var roomdata = jsxc.storage.getUserItem('buddy', room) || {};

         if (roomdata.autojoin && roomdata.config === self.CONST.ROOMCONFIG.INSTANT) {
            self.conn.muc.createInstantRoom(room);
         } else if (roomdata.autojoin && typeof roomdata.config !== 'undefined' && roomdata.config !== null) {
            self.conn.muc.saveConfiguration(room, roomdata.config, function() {
               jsxc.debug('Cached room configuration saved.');
            }, function() {
               jsxc.warn('Could not save cached room configuration.');

               //@TODO display error
            });
         } else {
            jsxc.gui.showSelectionDialog({
               header: $.t('Room_creation'),
               msg: $.t('Do_you_want_to_change_the_default_room_configuration'),
               primary: {
                  label: $.t('Default'),
                  cb: function() {
                     jsxc.gui.dialog.close();

                     self.conn.muc.createInstantRoom(room);

                     jsxc.storage.updateUserItem('buddy', room, 'config', self.CONST.ROOMCONFIG.INSTANT);
                  }
               },
               option: {
                  label: $.t('Change'),
                  cb: function() {
                     self.showRoomConfiguration(room);
                  }
               }
            });
         }
      },
      /** Inform user that he or she has been banned */
      301: function(room, nickname, data, xdata) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_banned')
            });

            jsxc.muc.postReason(room, xdata);
         } else {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_info_banned', {
                  nickname: nickname,
                  escapeInterpolation: true
               })
            });
         }
      },
      /** Inform user that he or she has been kicked */
      307: function(room, nickname, data, xdata) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_kicked')
            });

            jsxc.muc.postReason(room, xdata);
         } else {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_info_kicked', {
                  nickname: nickname,
                  escapeInterpolation: true
               })
            });
         }
      },
      /** Inform user that he or she is beeing removed from the room because of an affiliation change */
      321: function(room, nickname) {
         var own = jsxc.storage.getUserItem('ownNicknames') || {};

         if (own[room] === nickname) {
            jsxc.muc.close(room);

            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_affiliation')
            });
         } else {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_info_affiliation', {
                  nickname: nickname,
                  escapeInterpolation: true
               })
            });
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
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_membersonly')
            });
         } else {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: $.t('muc_removed_info_membersonly', {
                  nickname: nickname,
                  escapeInterpolation: true
               })
            });
         }
      },
      /**
       * Inform user that he or she is beeing removed from the room because the MUC service
       * is being shut down
       */
      332: function(room) {
         jsxc.muc.close(room);
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('muc_removed_shutdown')
         });
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
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.IN,
               msg: reason,
               sender: actor
            });
         } else {
            jsxc.gui.window.postMessage({
               bid: room,
               direction: jsxc.Message.SYS,
               msg: reason
            });
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
      var win = jsxc.gui.window.get(room);
      var jid = memberdata.jid;
      var ownBid = jsxc.jidToBid(jsxc.storage.getItem('jid'));
      var m = win.find('.jsxc_memberlist li[data-nickname="' + nickname + '"]');

      if (m.length === 0) {
         var title = jsxc.escapeHTML(nickname);

         m = $('<li><div class="jsxc_avatar"></div><div class="jsxc_name"/></li>');
         m.attr('data-nickname', nickname);

         win.find('.jsxc_memberlist ul').append(m);

         if (typeof jid === 'string') {
            m.find('.jsxc_name').text(jsxc.jidToBid(jid));
            title = title + '\n' + jsxc.jidToBid(jid);

            var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(jid));

            if (data !== null && typeof data === 'object') {
               jsxc.gui.avatar.update(m, jsxc.jidToBid(jid), data.avatar);
            } else if (jsxc.jidToBid(jid) === ownBid) {
               jsxc.gui.avatar.update(m, jsxc.jidToBid(jid), 'own');
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

      if (id && jsxc.el_exists(jsxc.Message.getDOM(id))) {
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

         jsxc.gui.window.init(room);

         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.IN,
            msg: body,
            stamp: stamp,
            sender: sender
         });
      }

      var subject = $(message).find('subject');

      if (subject.length > 0) {
         var roomdata = jsxc.storage.getUserItem('buddy', room);

         roomdata.subject = subject.text();

         jsxc.storage.setUserItem('buddy', room, roomdata);

         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('changed_subject_to', {
               nickname: nickname,
               subject: subject.text()
            })
         });
      }

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

      var bo = $('<a>');
      $('<span>').addClass('jsxc_icon jsxc_bookmarkicon').appendTo(bo);
      $('<span>').text($.t('Bookmark')).appendTo(bo);
      bo.addClass('jsxc_bookmarkOptions');
      bo.click(function(ev) {
         ev.preventDefault();

         jsxc.xmpp.bookmarks.showDialog(room);

         return false;
      });

      bud.find('.jsxc_menu ul').append($('<li>').append(bo));

      if (data.bookmarked) {
         bud.addClass('jsxc_bookmarked');
      }

      bud.off('click').click(function() {
         var data = jsxc.storage.getUserItem('buddy', room);

         if (data.state === self.CONST.ROOMSTATE.INIT || data.state === self.CONST.ROOMSTATE.EXITED) {
            self.showJoinChat();

            $('#jsxc_room').val(Strophe.getNodeFromJid(data.jid));
            $('#jsxc_nickname').val(data.nickname);
            $('#jsxc_bookmark').prop('checked', data.bookmarked);
            $('#jsxc_autojoin').prop('checked', data.autojoin);
            $('#jsxc_dialog .jsxc_bookmark').hide();
         } else {
            jsxc.gui.window.open(room);
         }
      });

      bud.find('.jsxc_delete').click(function() {
         if (data.bookmarked) {
            jsxc.xmpp.bookmarks.delete(room);
         }

         self.leave(room);
         return false;
      });
   },

   /**
    * Some helper functions.
    *
    * @type {Object}
    */
   helper: {
      /**
       * Convert x:data form to html.
       *
       * @param  {Strophe.x.Form} form - x:data form
       * @return {jQuery} jQuery representation of x:data field
       */
      formToHTML: function(form) {
         if (!(form instanceof Strophe.x.Form)) {
            return;
         }

         var html = $('<form>');

         html.attr('data-type', form.type);
         html.addClass('form-horizontal');

         if (form.title) {
            html.append("<h3>" + form.title + "</h3>");
         }

         if (form.instructions) {
            html.append("<p>" + form.instructions + "</p>");
         }

         if (form.fields.length > 0) {
            var i;
            for (i = 0; i < form.fields.length; i++) {
               html.append(jsxc.muc.helper.fieldToHtml(form.fields[i]));
            }
         }

         return $('<div>').append(html).html();
      },

      /**
       * Convert x:data field to html.
       *
       * @param  {Strophe.x.Field} field - x:data field
       * @return {html} html representation of x:data field
       */
      fieldToHtml: function(field) {
         var self = field || this;
         field = null;
         var el, val, opt, i, o, j, k, txt, line, _ref2;

         var id = "Strophe.x.Field-" + self['type'] + "-" + self['var'];
         var html = $('<div>');
         html.addClass('form-group');

         if (self.label) {
            var label = $('<label>');
            label.attr('for', id);
            label.addClass('col-sm-6 control-label');
            label.text(self.label);
            label.appendTo(html);
         }

         switch (self.type.toLowerCase()) {
            case 'list-single':
            case 'list-multi':
               el = $('<select>');
               if (self.type === 'list-multi') {
                  el.attr('multiple', 'multiple');
               }

               for (i = 0; i < self.options.length; i++) {
                  opt = self.options[i];
                  if (!opt) {
                     continue;
                  }
                  o = $(opt.toHTML());

                  for (j = 0; j < self.values.length; j++) {
                     k = self.values[j];
                     if (k.toString() === opt.value.toString()) {
                        o.attr('selected', 'selected');
                     }
                  }
                  o.appendTo(el);
               }

               break;
            case 'text-multi':
            case 'jid-multi':
               el = $("<textarea>");
               txt = ((function() {
                  var i, _results;
                  _results = [];
                  for (i = 0; i < self.values.length; i++) {
                     line = self.values[i];
                     _results.push(line);
                  }
                  return _results;
               }).call(this)).join('\n');
               if (txt) {
                  el.text(txt);
               }
               break;
            case 'text-single':
            case 'boolean':
            case 'text-private':
            case 'hidden':
            case 'fixed':
            case 'jid-single':
               el = $("<input>");

               if (self.values) {
                  el.attr('value', self.values[0]);
               }
               switch (self.type.toLowerCase()) {
                  case 'text-single':
                     el.attr('type', 'text');
                     el.attr('placeholder', self.desc);
                     el.addClass('form-control');
                     break;
                  case 'boolean':
                     el.attr('type', 'checkbox');
                     val = (_ref2 = self.values[0]) != null ? typeof _ref2.toString === "function" ? _ref2.toString() : void 0 : void 0;
                     if (val && (val === "true" || val === "1")) {
                        el.attr('checked', 'checked');
                     }
                     break;
                  case 'text-private':
                     el.attr('type', 'password');
                     el.addClass('form-control');
                     break;
                  case 'hidden':
                     el.attr('type', 'hidden');
                     break;
                  case 'fixed':
                     el.attr('type', 'text').attr('readonly', 'readonly');
                     el.addClass('form-control');
                     break;
                  case 'jid-single':
                     el.attr('type', 'email');
                     el.addClass('form-control');
               }
               break;
            default:
               el = $("<input type='text'>");
         }

         el.attr('id', id);
         el.attr('name', self["var"]);

         if (self.required) {
            el.attr('required', self.required);
         }

         var inner = el;
         el = $('<div>');
         el.addClass('col-sm-6');
         el.append(inner);

         html.append(el);

         return html.get(0);
      }
   },

   isGroupchat: function(jid) {
      var bid = jsxc.jidToBid(jid);

      var userData = jsxc.storage.setUserItem('buddy', bid) || {};

      return userData.type === 'groupchat';
   }
};

$(document).on('init.window.jsxc', jsxc.muc.initWindow);
$(document).on('add.roster.jsxc', jsxc.muc.onAddRoster);

$(document).on('attached.jsxc', function() {
   jsxc.muc.init();
});

$(document).one('connected.jsxc', function() {
   jsxc.storage.removeUserItem('roomNames');
   jsxc.storage.removeUserItem('ownNicknames');
});
