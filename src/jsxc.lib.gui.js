/* global Favico*/
/**
 * Handle functions for chat window's and buddylist
 * 
 * @namespace jsxc.gui
 */
jsxc.gui = {
   /** Smilie token to file mapping */
   emotions: [
      ['O:-) O:)', 'angel'],
      ['>:-( >:( &gt;:-( &gt;:(', 'angry'],
      [':-) :)', 'smile'],
      [':-D :D', 'grin'],
      [':-( :(', 'sad'],
      [';-) ;)', 'wink'],
      [':-P :P', 'tonguesmile'],
      ['=-O', 'surprised'],
      [':kiss: :-*', 'kiss'],
      ['8-) :cool:', 'sunglassess'],
      [':\'-( :\'( :&amp;apos;-(', 'crysad'],
      [':-/', 'doubt'],
      [':-X :X', 'zip'],
      [':yes:', 'thumbsup'],
      [':no:', 'thumbsdown'],
      [':beer:', 'beer'],
      [':devil:', 'devil'],
      [':kiss: :kissing:', 'kissing'],
      ['@->-- :rose: @-&gt;--', 'rose'],
      [':music:', 'music'],
      [':love:', 'love'],
      [':zzz:', 'tired']
   ],

   favicon: null,

   /**
    * Different uri query actions as defined in XEP-0147.
    * 
    * @namespace jsxc.gui.queryActions
    */
   queryActions: {
      /** xmpp:JID?message[;body=TEXT] */
      message: function(jid, params) {
         var win = jsxc.gui.window.open(jsxc.jidToBid(jid));

         if (params && typeof params.body === 'string') {
            win.find('.jsxc_textinput').val(params.body);
         }
      },

      /** xmpp:JID?remove */
      remove: function(jid) {
         jsxc.gui.showRemoveDialog(jsxc.jidToBid(jid));
      },

      /** xmpp:JID?subscribe[;name=NAME] */
      subscribe: function(jid, params) {
         jsxc.gui.showContactDialog(jid);

         if (params && typeof params.name) {
            $('#jsxc_alias').val(params.name);
         }
      },

      /** xmpp:JID?vcard */
      vcard: function(jid) {
         jsxc.gui.showVcard(jid);
      },

      /** xmpp:JID?join[;password=TEXT] */
      join: function(jid, params) {
         var password = (params && params.password) ? params.password : null;

         jsxc.muc.showJoinChat(jid, password);
      }
   },

   /**
    * Creates application skeleton.
    * 
    * @memberOf jsxc.gui
    */
   init: function() {
      // Prevent duplicate windowList
      if ($('#jsxc_windowList').length > 0) {
         return;
      }

      $('body').append($(jsxc.gui.template.get('windowList')));

      $(window).resize(jsxc.gui.updateWindowListSB);
      $('#jsxc_windowList').resize(jsxc.gui.updateWindowListSB);

      $('#jsxc_windowListSB .jsxc_scrollLeft').click(function() {
         jsxc.gui.scrollWindowListBy(-200);
      });
      $('#jsxc_windowListSB .jsxc_scrollRight').click(function() {
         jsxc.gui.scrollWindowListBy(200);
      });
      $('#jsxc_windowList').on('wheel', function(ev) {
         if ($('#jsxc_windowList').data('isOver')) {
            jsxc.gui.scrollWindowListBy((ev.originalEvent.wheelDelta > 0) ? 200 : -200);
         }
      });

      jsxc.gui.tooltip('#jsxc_windowList');

      var fo = jsxc.options.get('favicon');
      if (fo && fo.enable) {
         jsxc.gui.favicon = new Favico({
            animation: 'pop',
            bgColor: fo.bgColor,
            textColor: fo.textColor
         });

         jsxc.gui.favicon.badge(jsxc.storage.getUserItem('unreadMsg') || 0);
      }

      if (!jsxc.el_exists('#jsxc_roster')) {
         jsxc.gui.roster.init();
      }

      // prepare regexp for emotions
      $.each(jsxc.gui.emotions, function(i, val) {
         // escape characters
         var reg = val[0].replace(/(\/|\||\*|\.|\+|\?|\^|\$|\(|\)|\[|\]|\{|\})/g, '\\$1');
         reg = '(' + reg.split(' ').join('|') + ')';
         jsxc.gui.emotions[i][2] = new RegExp(reg, 'g');
      });

      // We need this often, so we creates some template jquery objects
      jsxc.gui.windowTemplate = $(jsxc.gui.template.get('chatWindow'));
      jsxc.gui.buddyTemplate = $(jsxc.gui.template.get('rosterBuddy'));
   },

   /**
    * Init tooltip plugin for given jQuery selector.
    * 
    * @param {String} selector jQuery selector
    * @memberOf jsxc.gui
    */
   tooltip: function(selector) {
      $(selector).tooltip({
         show: {
            delay: 600
         },
         content: function() {
            return $(this).attr('title').replace(/\n/g, '<br />');
         }
      });
   },

   /**
    * Updates Information in roster and chatbar
    * 
    * @param {String} bid bar jid
    */
   update: function(bid) {
      var data = jsxc.storage.getUserItem('buddy', bid);

      if (!data) {
         jsxc.debug('No data for ' + bid);
         return;
      }

      var ri = jsxc.gui.roster.getItem(bid); // roster item from user
      var we = jsxc.gui.window.get(bid); // window element from user
      var ue = ri.add(we); // both
      var spot = $('.jsxc_spot[data-bid="' + bid + '"]');

      // Attach data to corresponding roster item
      ri.data(data);

      // Add online status
      ue.add(spot).removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + jsxc.CONST.STATUS[data.status]);

      // Change name and add title
      ue.find('.jsxc_name:first').add(spot).text(data.name).attr('title', $.t('is_', {
         status: $.t(jsxc.CONST.STATUS[data.status])
      }));

      // Update gui according to encryption state
      switch (data.msgstate) {
         case 0:
            we.find('.jsxc_transfer').removeClass('jsxc_enc jsxc_fin').attr('title', $.t('your_connection_is_unencrypted'));
            we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
            we.find('.jsxc_settings .jsxc_transfer').text($.t('start_private'));
            break;
         case 1:
            we.find('.jsxc_transfer').addClass('jsxc_enc').attr('title', $.t('your_connection_is_encrypted'));
            we.find('.jsxc_settings .jsxc_verification').removeClass('jsxc_disabled');
            we.find('.jsxc_settings .jsxc_transfer').text($.t('close_private'));
            break;
         case 2:
            we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
            we.find('.jsxc_transfer').removeClass('jsxc_enc').addClass('jsxc_fin').attr('title', $.t('your_buddy_closed_the_private_connection'));
            we.find('.jsxc_settings .jsxc_transfer').text($.t('close_private'));
            break;
      }

      // update gui according to verification state
      if (data.trust) {
         we.find('.jsxc_transfer').addClass('jsxc_trust').attr('title', $.t('your_buddy_is_verificated'));
      } else {
         we.find('.jsxc_transfer').removeClass('jsxc_trust');
      }

      // update gui according to subscription state
      if (data.sub && data.sub !== 'both') {
         ue.addClass('jsxc_oneway');
      } else {
         ue.removeClass('jsxc_oneway');
      }

      var info = '<b>' + Strophe.getBareJidFromJid(data.jid) + '</b>\n';
      info += $.t('Subscription') + ': ' + $.t(data.sub) + '\n';
      info += $.t('Status') + ': ' + $.t(jsxc.CONST.STATUS[data.status]);

      ri.find('.jsxc_name').attr('title', info);

      jsxc.gui.updateAvatar(ri.add(we.find('.jsxc_bar')), data.jid, data.avatar);
   },

   /**
    * Update avatar on all given elements.
    * 
    * @memberOf jsxc.gui
    * @param {jQuery} el Elements with subelement .jsxc_avatar
    * @param {string} jid Jid
    * @param {string} aid Avatar id (sha1 hash of image)
    */
   updateAvatar: function(el, jid, aid) {

      var setAvatar = function(src) {
         if (src === 0 || src === '0') {
            if (typeof jsxc.options.defaultAvatar === 'function') {
               jsxc.options.defaultAvatar.call(el, jid);
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

      if (typeof aid === 'undefined') {
         setAvatar(0);
         return;
      }

      var avatarSrc = jsxc.storage.getUserItem('avatar', aid);

      if (avatarSrc !== null) {
         setAvatar(avatarSrc);
      } else {
         jsxc.xmpp.conn.vcard.get(function(stanza) {
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

            jsxc.storage.setUserItem('avatar', aid, src);
            setAvatar(src);
         }, Strophe.getBareJidFromJid(jid), function(msg) {
            jsxc.warn('Could not load vcard.', msg);

            jsxc.storage.setUserItem('avatar', aid, 0);
            setAvatar(0);
         });
      }
   },

   /**
    * Updates scrollbar handlers.
    * 
    * @memberOf jsxc.gui
    */
   updateWindowListSB: function() {

      if ($('#jsxc_windowList>ul').width() > $('#jsxc_windowList').width()) {
         $('#jsxc_windowListSB > div').removeClass('jsxc_disabled');
      } else {
         $('#jsxc_windowListSB > div').addClass('jsxc_disabled');
         $('#jsxc_windowList>ul').css('right', '0px');
      }
   },

   /**
    * Scroll window list by offset.
    * 
    * @memberOf jsxc.gui
    * @param offset
    */
   scrollWindowListBy: function(offset) {

      var scrollWidth = $('#jsxc_windowList>ul').width();
      var width = $('#jsxc_windowList').width();
      var el = $('#jsxc_windowList>ul');
      var right = parseInt(el.css('right')) - offset;
      var padding = $("#jsxc_windowListSB").width();

      if (scrollWidth < width) {
         return;
      }

      if (right > 0) {
         right = 0;
      }

      if (right < width - scrollWidth - padding) {
         right = width - scrollWidth - padding;
      }

      el.css('right', right + 'px');
   },

   /**
    * Returns the window element
    * 
    * @param {String} bid
    * @returns {jquery} jQuery object of the window element
    */
   getWindow: function(bid) {
      jsxc.warn('jsxc.gui.getWindow is deprecated!');

      return jsxc.gui.window.get(bid);
   },

   /**
    * Toggle list with timeout, like menu or settings
    * 
    * @memberof jsxc.gui
    */
   toggleList: function() {
      var self = $(this);

      self.disableSelection();

      var ul = self.find('ul');
      var slideUp = null;

      slideUp = function() {
         ul.slideUp({
            complete: function() {
               self.removeClass('jsxc_opened');
            }
         });

         $('body').off('click', null, slideUp);
      };

      $(this).click(function() {

         if (ul.is(":hidden")) {
            // hide other lists
            $('body').click();
            $('body').one('click', slideUp);
         } else {
            $('body').off('click', null, slideUp);
         }

         ul.slideToggle();

         window.clearTimeout(ul.data('timer'));

         self.toggleClass('jsxc_opened');

         return false;
      }).mouseleave(function() {
         ul.data('timer', window.setTimeout(slideUp, 2000));
      }).mouseenter(function() {
         window.clearTimeout(ul.data('timer'));
      });
   },

   /**
    * Creates and show loginbox
    */
   showLoginBox: function() {
      // Set focus to password field
      $(document).on("complete.dialog.jsxc", function() {
         $('#jsxc_password').focus();
      });

      jsxc.gui.dialog.open(jsxc.gui.template.get('loginBox'));

      var alert = $('#jsxc_dialog').find('.jsxc_alert');
      alert.hide();

      $('#jsxc_dialog').find('form').submit(function(ev) {

         ev.preventDefault();

         $(this).find('button[data-jsxc-loading-text]').trigger('btnloading.jsxc');

         jsxc.options.loginForm.form = $(this);
         jsxc.options.loginForm.jid = $(this).find('#jsxc_username');
         jsxc.options.loginForm.pass = $(this).find('#jsxc_password');

         jsxc.triggeredFromBox = true;
         jsxc.options.loginForm.triggered = false;

         jsxc.prepareLogin(function(settings) {
            if (settings === false) {
               onAuthFail();
            } else {
               $(document).on('authfail.jsxc', onAuthFail);

               jsxc.xmpp.login();
            }
         });
      });

      function onAuthFail() {
         alert.show();
         jsxc.gui.dialog.resize();

         $('#jsxc_dialog').find('button').trigger('btnfinished.jsxc');

         $('#jsxc_dialog').find('input').one('keypress', function() {
            alert.hide();
            jsxc.gui.dialog.resize();
         });
      }
   },

   /**
    * Creates and show the fingerprint dialog
    * 
    * @param {String} bid
    */
   showFingerprints: function(bid) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('fingerprintsDialog', bid));
   },

   /**
    * Creates and show the verification dialog
    * 
    * @param {String} bid
    */
   showVerification: function(bid) {

      // Check if there is a open dialog
      if ($('#jsxc_dialog').length > 0) {
         setTimeout(function() {
            jsxc.gui.showVerification(bid);
         }, 3000);
         return;
      }

      // verification only possible if the connection is encrypted
      if (jsxc.storage.getUserItem('buddy', bid).msgstate !== OTR.CONST.MSGSTATE_ENCRYPTED) {
         jsxc.warn('Connection not encrypted');
         return;
      }

      jsxc.gui.dialog.open(jsxc.gui.template.get('authenticationDialog', bid));

      // Add handler

      $('#jsxc_dialog > div:gt(0)').hide();
      $('#jsxc_dialog > div:eq(0) button').click(function() {

         $(this).siblings().removeClass('active');
         $(this).addClass('active');
         $(this).get(0).blur();

         $('#jsxc_dialog > div:gt(0)').hide();
         $('#jsxc_dialog > div:eq(' + ($(this).index() + 1) + ')').show().find('input:first').focus();
      });

      // Manual
      $('#jsxc_dialog > div:eq(1) .jsxc_submit').click(function() {
         if (jsxc.master) {
            jsxc.otr.objects[bid].trust = true;
         }

         jsxc.storage.updateUserItem('buddy', bid, 'trust', true);

         jsxc.gui.dialog.close();

         jsxc.storage.updateUserItem('buddy', bid, 'trust', true);
         jsxc.gui.window.postMessage(bid, 'sys', $.t('conversation_is_now_verified'));
         jsxc.gui.update(bid);
      });

      // Question
      $('#jsxc_dialog > div:eq(2) .jsxc_submit').click(function() {
         var div = $('#jsxc_dialog > div:eq(2)');
         var sec = div.find('#jsxc_secret2').val();
         var quest = div.find('#jsxc_quest').val();

         if (sec === '' || quest === '') {
            // Add information for the user which form is missing
            div.find('input[value=""]').addClass('jsxc_invalid').keyup(function() {
               if ($(this).val().match(/.*/)) {
                  $(this).removeClass('jsxc_invalid');
               }
            });
            return;
         }

         if (jsxc.master) {
            jsxc.otr.sendSmpReq(bid, sec, quest);
         } else {
            jsxc.storage.setUserItem('smp_' + bid, {
               sec: sec,
               quest: quest
            });
         }

         jsxc.gui.dialog.close();

         jsxc.gui.window.postMessage(bid, 'sys', $.t('authentication_query_sent'));
      });

      // Secret
      $('#jsxc_dialog > div:eq(3) .jsxc_submit').click(function() {
         var div = $('#jsxc_dialog > div:eq(3)');
         var sec = div.find('#jsxc_secret').val();

         if (sec === '') {
            // Add information for the user which form is missing
            div.find('#jsxc_secret').addClass('jsxc_invalid').keyup(function() {
               if ($(this).val().match(/.*/)) {
                  $(this).removeClass('jsxc_invalid');
               }
            });
            return;
         }

         if (jsxc.master) {
            jsxc.otr.sendSmpReq(bid, sec);
         } else {
            jsxc.storage.setUserItem('smp_' + bid, {
               sec: sec,
               quest: null
            });
         }

         jsxc.gui.dialog.close();

         jsxc.gui.window.postMessage(bid, 'sys', $.t('authentication_query_sent'));
      });
   },

   /**
    * Create and show approve dialog
    * 
    * @param {type} from valid jid
    */
   showApproveDialog: function(from) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('approveDialog'), {
         'noClose': true
      });

      $('#jsxc_dialog .jsxc_their_jid').text(Strophe.getBareJidFromJid(from));

      $('#jsxc_dialog .jsxc_deny').click(function(ev) {
         ev.stopPropagation();

         jsxc.xmpp.resFriendReq(from, false);

         jsxc.gui.dialog.close();
      });

      $('#jsxc_dialog .jsxc_approve').click(function(ev) {
         ev.stopPropagation();

         var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(from));

         jsxc.xmpp.resFriendReq(from, true);

         // If friendship is not mutual show contact dialog
         if (!data || data.sub === 'from') {
            jsxc.gui.showContactDialog(from);
         }
      });
   },

   /**
    * Create and show dialog to add a buddy
    * 
    * @param {string} [username] jabber id
    */
   showContactDialog: function(username) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('contactDialog'));

      // If we got a friendship request, we would display the username in our
      // response
      if (username) {
         $('#jsxc_username').val(username);
      }

      $('#jsxc_username').keyup(function() {
         if (typeof jsxc.options.getUsers === 'function') {
            var val = $(this).val();
            $('#jsxc_userlist').empty();

            if (val !== '') {
               jsxc.options.getUsers.call(this, val, function(list) {
                  $.each(list || {}, function(uid, displayname) {
                     var option = $('<option>');
                     option.attr('data-username', uid);
                     option.attr('data-alias', displayname);

                     option.attr('value', uid).appendTo('#jsxc_userlist');

                     if (uid !== displayname) {
                        option.clone().attr('value', displayname).appendTo('#jsxc_userlist');
                     }
                  });
               });
            }
         }
      });

      $('#jsxc_username').on('input', function() {
         var val = $(this).val();
         var option = $('#jsxc_userlist').find('option[data-username="' + val + '"], option[data-alias="' + val + '"]');

         if (option.length > 0) {
            $('#jsxc_username').val(option.attr('data-username'));
            $('#jsxc_alias').val(option.attr('data-alias'));
         }
      });

      $('#jsxc_dialog form').submit(function(ev) {
         ev.preventDefault();

         var username = $('#jsxc_username').val();
         var alias = $('#jsxc_alias').val();

         if (!username.match(/@(.*)$/)) {
            username += '@' + Strophe.getDomainFromJid(jsxc.storage.getItem('jid'));
         }

         // Check if the username is valid
         if (!username || !username.match(jsxc.CONST.REGEX.JID)) {
            // Add notification
            $('#jsxc_username').addClass('jsxc_invalid').keyup(function() {
               if ($(this).val().match(jsxc.CONST.REGEX.JID)) {
                  $(this).removeClass('jsxc_invalid');
               }
            });
            return false;
         }
         jsxc.xmpp.addBuddy(username, alias);

         jsxc.gui.dialog.close();

         return false;
      });
   },

   /**
    * Create and show dialog to remove a buddy
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   showRemoveDialog: function(bid) {

      jsxc.gui.dialog.open(jsxc.gui.template.get('removeDialog', bid));

      var data = jsxc.storage.getUserItem('buddy', bid);

      $('#jsxc_dialog .jsxc_remove').click(function(ev) {
         ev.stopPropagation();

         if (jsxc.master) {
            jsxc.xmpp.removeBuddy(data.jid);
         } else {
            // inform master
            jsxc.storage.setUserItem('deletebuddy', bid, {
               jid: data.jid
            });
         }

         jsxc.gui.dialog.close();
      });
   },

   /**
    * Create and show a wait dialog
    * 
    * @param {type} msg message to display to the user
    * @returns {undefined}
    */
   showWaitAlert: function(msg) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('waitAlert', null, msg), {
         'noClose': true
      });
   },

   /**
    * Create and show a wait dialog
    * 
    * @param {type} msg message to display to the user
    * @returns {undefined}
    */
   showAlert: function(msg) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('alert', null, msg));
   },

   /**
    * Create and show a auth fail dialog
    * 
    * @returns {undefined}
    */
   showAuthFail: function() {
      jsxc.gui.dialog.open(jsxc.gui.template.get('authFailDialog'));

      if (jsxc.options.loginForm.triggered !== false) {
         $('#jsxc_dialog .jsxc_cancel').hide();
      }

      $('#jsxc_dialog .jsxc_retry').click(function() {
         jsxc.gui.dialog.close();
      });

      $('#jsxc_dialog .jsxc_cancel').click(function() {
         jsxc.submitLoginForm();
      });
   },

   /**
    * Create and show a confirm dialog
    * 
    * @param {String} msg Message
    * @param {function} confirm
    * @param {function} dismiss
    * @returns {undefined}
    */
   showConfirmDialog: function(msg, confirm, dismiss) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('confirmDialog', null, msg), {
         noClose: true
      });

      if (confirm) {
         $('#jsxc_dialog .jsxc_confirm').click(confirm);
      }

      if (dismiss) {
         $('#jsxc_dialog .jsxc_dismiss').click(dismiss);
      }
   },

   /**
    * Show about dialog.
    * 
    * @memberOf jsxc.gui
    */
   showAboutDialog: function() {
      jsxc.gui.dialog.open(jsxc.gui.template.get('aboutDialog'));

      $('#jsxc_dialog .jsxc_debuglog').click(function() {
         jsxc.gui.showDebugLog();
      });
   },

   /**
    * Show debug log.
    * 
    * @memberOf jsxc.gui
    */
   showDebugLog: function() {
      var userInfo = '<h3>User information</h3>';

      if (navigator) {
         var key;
         for (key in navigator) {
            if (navigator.hasOwnProperty(key) && typeof navigator[key] === 'string') {
               userInfo += '<b>' + key + ':</b> ' + navigator[key] + '<br />';
            }
         }
      }

      if (window.screen) {
         userInfo += '<b>Height:</b> ' + window.screen.height + '<br />';
         userInfo += '<b>Width:</b> ' + window.screen.width + '<br />';
      }

      userInfo += '<b>jsxc version:</b> ' + jsxc.version + '<br />';

      jsxc.gui.dialog.open('<div class="jsxc_log">' + userInfo + '<h3>Log</h3><pre>' + jsxc.escapeHTML(jsxc.log) + '</pre></div>');
   },

   /**
    * Show vCard of user with the given bar jid.
    * 
    * @memberOf jsxc.gui
    * @param {String} jid
    */
   showVcard: function(jid) {
      var bid = jsxc.jidToBid(jid);
      jsxc.gui.dialog.open(jsxc.gui.template.get('vCard', bid));

      var data = jsxc.storage.getUserItem('buddy', bid);

      if (data) {
         // Display resources and corresponding information
         var i, j, res, identities, identity = null,
            cap, client;
         for (i = 0; i < data.res.length; i++) {
            res = data.res[i];

            identities = [];
            cap = jsxc.xmpp.getCapabilitiesByJid(bid + '/' + res);

            if (cap !== null && cap.identities !== null) {
               identities = cap.identities;
            }

            client = '';
            for (j = 0; j < identities.length; j++) {
               identity = identities[j];
               if (identity.category === 'client') {
                  if (client !== '') {
                     client += ',\n';
                  }

                  client += identity.name + ' (' + identity.type + ')';
               }
            }

            var status = jsxc.storage.getUserItem('res', bid)[res];

            $('#jsxc_dialog ul.jsxc_vCard').append('<li class="jsxc_sep"><strong>' + $.t('Resource') + ':</strong> ' + res + '</li>');
            $('#jsxc_dialog ul.jsxc_vCard').append('<li><strong>' + $.t('Client') + ':</strong> ' + client + '</li>');
            $('#jsxc_dialog ul.jsxc_vCard').append('<li><strong>' + $.t('Status') + ':</strong> ' + $.t(jsxc.CONST.STATUS[status]) + '</li>');
         }
      }

      var printProp = function(el, depth) {
         var content = '';

         el.each(function() {
            var item = $(this);
            var children = $(this).children();

            content += '<li>';

            var prop = $.t(item[0].tagName);

            if (prop !== ' ') {
               content += '<strong>' + prop + ':</strong> ';
            }

            if (item[0].tagName === 'PHOTO') {

            } else if (children.length > 0) {
               content += '<ul>';
               content += printProp(children, depth + 1);
               content += '</ul>';
            } else if (item.text() !== '') {
               content += jsxc.escapeHTML(item.text());
            }

            content += '</li>';

            if (depth === 0 && $('#jsxc_dialog ul.jsxc_vCard').length > 0) {
               if ($('#jsxc_dialog ul.jsxc_vCard li.jsxc_sep:first').length > 0) {
                  $('#jsxc_dialog ul.jsxc_vCard li.jsxc_sep:first').before(content);
               } else {
                  $('#jsxc_dialog ul.jsxc_vCard').append(content);
               }
               content = '';
            }
         });

         if (depth > 0) {
            return content;
         }
      };

      var failedToLoad = function() {
         if ($('#jsxc_dialog ul.jsxc_vCard').length === 0) {
            return;
         }

         $('#jsxc_dialog p').remove();

         var content = '<p>';
         content += $.t('Sorry_your_buddy_doesnt_provide_any_information');
         content += '</p>';

         $('#jsxc_dialog').append(content);
      };

      jsxc.xmpp.loadVcard(bid, function(stanza) {

         if ($('#jsxc_dialog ul.jsxc_vCard').length === 0) {
            return;
         }

         $('#jsxc_dialog p').remove();

         var photo = $(stanza).find("vCard > PHOTO");

         if (photo.length > 0) {
            var img = photo.find('BINVAL').text();
            var type = photo.find('TYPE').text();
            var src = 'data:' + type + ';base64,' + img;

            if (photo.find('EXTVAL').length > 0) {
               src = photo.find('EXTVAL').text();
            }

            // concat chunks
            src = src.replace(/[\t\r\n\f]/gi, '');

            var img_el = $('<img class="jsxc_vCard" alt="avatar" />');
            img_el.attr('src', src);

            $('#jsxc_dialog h3').before(img_el);
         }

         if ($(stanza).find('vCard').length === 0 || ($(stanza).find('vcard > *').length === 1 && photo.length === 1)) {
            failedToLoad();
            return;
         }

         printProp($(stanza).find('vcard > *'), 0);

      }, failedToLoad);
   },

   showSettings: function() {
      jsxc.gui.dialog.open(jsxc.gui.template.get('settings'));

      if (jsxc.options.get('xmpp').overwrite === 'false' || jsxc.options.get('xmpp').overwrite === false) {
         $('.jsxc_fieldsetXmpp').parent().hide();
      }

      $('#jsxc_dialog form').each(function() {
         var self = $(this);

         self.find('input[type!="submit"]').each(function() {
            var id = this.id.split("-");
            var prop = id[0];
            var key = id[1];
            var type = this.type;

            var data = jsxc.options.get(prop);

            if (data && typeof data[key] !== 'undefined') {
               if (type === 'checkbox') {
                  if (data[key] !== 'false' && data[key] !== false) {
                     this.checked = 'checked';
                  }
               } else {
                  $(this).val(data[key]);
               }
            }
         });
      });

      $('#jsxc_dialog form').submit(function() {

         var self = $(this);
         var data = {};

         self.find('input[type!="submit"]').each(function() {
            var id = this.id.split("-");
            var prop = id[0];
            var key = id[1];
            var val;
            var type = this.type;

            if (type === 'checkbox') {
               val = this.checked;
            } else {
               val = $(this).val();
            }

            if (!data[prop]) {
               data[prop] = {};
            }

            data[prop][key] = val;
         });

         $.each(data, function(key, val) {
            jsxc.options.set(key, val);
         });

         var success = jsxc.options.saveSettinsPermanent.call(this, data);

         if (typeof self.attr('data-onsubmit') === 'string') {
            jsxc.exec(self.attr('data-onsubmit'), [success]);
         }

         setTimeout(function() {
            if (success) {
               self.find('button[type="submit"]').switchClass('btn-primary', 'btn-success');
            } else {
               self.find('button[type="submit"]').switchClass('btn-primary', 'btn-danger');
            }
            setTimeout(function() {
               self.find('button[type="submit"]').switchClass('btn-danger btn-success', 'btn-primary');
            }, 2000);
         }, 200);

         return false;
      });
   },

   /**
    * Show prompt for notification permission.
    * 
    * @memberOf jsxc.gui
    */
   showRequestNotification: function() {

      jsxc.switchEvents({
         'notificationready.jsxc': function() {
            jsxc.gui.dialog.close();
            jsxc.notification.init();
            jsxc.storage.setUserItem('notification', 1);
         },
         'notificationfailure.jsxc': function() {
            jsxc.gui.dialog.close();
            jsxc.options.notification = false;
            jsxc.storage.setUserItem('notification', 0);
         }
      });

      jsxc.gui.showConfirmDialog($.t('Should_we_notify_you_'), function() {
         jsxc.gui.dialog.open(jsxc.gui.template.get('pleaseAccept'), {
            noClose: true
         });

         jsxc.notification.requestPermission();
      }, function() {
         $(document).trigger('notificationfailure.jsxc');
      });
   },

   showUnknownSender: function(bid) {
      var confirmationText = $.t('You_received_a_message_from_an_unknown_sender_', {
         sender: bid
      });
      jsxc.gui.showConfirmDialog(confirmationText, function() {

         jsxc.gui.dialog.close();

         jsxc.storage.saveBuddy(bid, {
            jid: bid,
            name: bid,
            status: 0,
            sub: 'none',
            res: []
         });

         jsxc.gui.window.open(bid);

      }, function() {
         // reset state
         jsxc.storage.removeUserItem('chat', bid);
      });
   },

   showSelectionDialog: function(header, msg, primary, option, primaryLabel, optionLabel) {
      var opt;

      if (arguments.length === 1 && typeof header === 'object' && header !== null) {
         opt = header;
      } else {
         opt = {
            header: header,
            msg: msg,
            primary: {
               label: primaryLabel,
               cb: primary
            },
            option: {
               label: optionLabel,
               cb: option
            }
         };
      }

      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('selectionDialog'), {
         noClose: true
      });

      if (opt.header) {
         dialog.find('h3').text(opt.header);
      } else {
         dialog.find('h3').hide();
      }

      if (opt.msg) {
         dialog.find('p').text(opt.msg);
      } else {
         dialog.find('p').hide();
      }

      if (opt.primary && opt.primary.label) {
         dialog.find('.btn-primary').text(opt.primary.label);
      }

      if (opt.primary && opt.option.label) {
         dialog.find('.btn-default').text(opt.option.label);
      }

      if (opt.primary && opt.primary.cb) {
         dialog.find('.btn-primary').click(opt.primary.cb);
      }

      if (opt.primary && opt.option.cb) {
         dialog.find('.btn-primary').click(opt.option.cb);
      }
   },

   /**
    * Change own presence to pres.
    * 
    * @memberOf jsxc.gui
    * @param pres {CONST.STATUS} New presence state
    * @param external {boolean} True if triggered from other tab.
    */
   changePresence: function(pres, external) {

      if (external !== true) {
         jsxc.storage.setUserItem('presence', pres);
      }

      if (jsxc.master) {
         jsxc.xmpp.sendPres();
      }

      $('#jsxc_presence > span').text($('#jsxc_presence > ul .jsxc_' + pres).text());

      jsxc.gui.updatePresence('own', pres);
   },

   /**
    * Update all presence objects for given user.
    * 
    * @memberOf jsxc.gui
    * @param bid bar jid of user.
    * @param {CONST.STATUS} pres New presence state.
    */
   updatePresence: function(bid, pres) {

      if (bid === 'own') {
         if (pres === 'dnd') {
            $('#jsxc_menu .jsxc_muteNotification').addClass('jsxc_disabled');
            jsxc.notification.muteSound(true);
         } else {
            $('#jsxc_menu .jsxc_muteNotification').removeClass('jsxc_disabled');

            if (!jsxc.options.get('muteNotification')) {
               jsxc.notification.unmuteSound(true);
            }
         }
      }

      $('.jsxc_presence[data-bid="' + bid + '"]').removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + pres);
   },

   /**
    * Switch read state to UNread and increase counter.
    * 
    * @memberOf jsxc.gui
    * @param bid
    */
   unreadMsg: function(bid) {
      var winData = jsxc.storage.getUserItem('window', bid);
      var count = (winData && winData.unread) || 0;
      count = (count === true) ? 1 : count + 1; //unread was boolean (<2.1.0)

      // update user counter
      winData.unread = count;
      jsxc.storage.setUserItem('window', bid, winData);

      // update counter of total unread messages
      var total = jsxc.storage.getUserItem('unreadMsg') || 0;
      total++;
      jsxc.storage.setUserItem('unreadMsg', total);

      if (jsxc.gui.favicon) {
         jsxc.gui.favicon.badge(total);
      }

      jsxc.gui._unreadMsg(bid, count);
   },

   /**
    * Switch read state to UNread.
    * 
    * @memberOf jsxc.gui
    * @param bid
    * @param count
    */
   _unreadMsg: function(bid, count) {
      var win = jsxc.gui.window.get(bid);

      if (typeof count !== 'number') {
         // get counter after page reload
         var winData = jsxc.storage.getUserItem('window', bid);
         count = (winData && winData.unread) || 1;
         count = (count === true) ? 1 : count; //unread was boolean (<2.1.0)
      }

      var el = jsxc.gui.roster.getItem(bid).add(win);

      el.addClass('jsxc_unreadMsg');
      el.find('.jsxc_unread').text(count);
   },

   /**
    * Switch read state to read.
    * 
    * @memberOf jsxc.gui
    * @param bid
    */
   readMsg: function(bid) {
      var win = jsxc.gui.window.get(bid);
      var winData = jsxc.storage.getUserItem('window', bid);
      var count = (winData && winData.unread) || 0;
      count = (count === true) ? 0 : count; //unread was boolean (<2.1.0)

      var el = jsxc.gui.roster.getItem(bid).add(win);
      el.removeClass('jsxc_unreadMsg');
      el.find('.jsxc_unread').text(0);

      // update counters if not called from other tab
      if (count > 0) {
         // update counter of total unread messages
         var total = jsxc.storage.getUserItem('unreadMsg') || 0;
         total -= count;
         jsxc.storage.setUserItem('unreadMsg', total);

         if (jsxc.gui.favicon) {
            jsxc.gui.favicon.badge(total);
         }

         jsxc.storage.updateUserItem('window', bid, 'unread', 0);
      }
   },

   /**
    * This function searches for URI scheme according to XEP-0147.
    * 
    * @memberOf jsxc.gui
    * @param container In which element should we search?
    */
   detectUriScheme: function(container) {
      container = (container) ? $(container) : $('body');

      container.find("a[href^='xmpp:']").each(function() {

         var element = $(this);
         var href = element.attr('href').replace(/^xmpp:/, '');
         var jid = href.split('?')[0];
         var action, params = {};

         if (href.indexOf('?') < 0) {
            action = 'message';
         } else {
            var pairs = href.substring(href.indexOf('?') + 1).split(';');
            action = pairs[0];

            var i, key, value;
            for (i = 1; i < pairs.length; i++) {
               key = pairs[i].split('=')[0];
               value = (pairs[i].indexOf('=') > 0) ? pairs[i].substring(pairs[i].indexOf('=') + 1) : null;

               params[decodeURIComponent(key)] = decodeURIComponent(value);
            }
         }

         if (typeof jsxc.gui.queryActions[action] === 'function') {
            element.addClass('jsxc_uriScheme jsxc_uriScheme_' + action);

            element.off('click').click(function(ev) {
               ev.stopPropagation();

               jsxc.gui.queryActions[action].call(jsxc, jid, params);

               return false;
            });
         }
      });
   },

   detectEmail: function(container) {
      container = (container) ? $(container) : $('body');

      container.find('a[href^="mailto:"]').each(function() {
         var spot = $("<span>X</span>").addClass("jsxc_spot");
         var href = $(this).attr("href").replace(/^ *mailto:/, "").trim();

         if (href !== '' && href !== Strophe.getBareJidFromJid(jsxc.storage.getItem("jid"))) {
            var bid = jsxc.jidToBid(href);
            var self = $(this);
            var s = self.prev();

            if (!s.hasClass('jsxc_spot')) {
               s = spot.clone().attr('data-bid', bid);

               self.before(s);
            }

            s.off('click');

            if (jsxc.storage.getUserItem('buddy', bid)) {
               jsxc.gui.update(bid);
               s.click(function() {
                  jsxc.gui.window.open(bid);

                  return false;
               });
            } else {
               s.click(function() {
                  jsxc.gui.showContactDialog(href);

                  return false;
               });
            }
         }
      });
   },

   avatarPlaceholder: function(el, seed, text) {
      text = text || seed;

      var options = jsxc.options.get('avatarplaceholder') || {};
      var hash = jsxc.hashStr(seed);

      var hue = Math.abs(hash) % 360;
      var saturation = options.saturation || 90;
      var lightness = options.lightness || 65;

      el.css({
         'background-color': 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)',
         'color': '#fff',
         'font-weight': 'bold',
         'text-align': 'center',
         'line-height': el.height() + 'px',
         'font-size': el.height() * 0.6 + 'px'
      });

      if (typeof text === 'string' && text.length > 0) {
         el.text(text[0].toUpperCase());
      }
   }
};

/**
 * Handle functions related to the gui of the roster
 * 
 * @namespace jsxc.gui.roster
 */
jsxc.gui.roster = {

   /** True if roster is initialised */
   ready: false,

   /** True if all items are loaded */
   loaded: false,

   /**
    * Init the roster skeleton
    * 
    * @memberOf jsxc.gui.roster
    * @returns {undefined}
    */
   init: function() {
      $(jsxc.options.rosterAppend + ':first').append($(jsxc.gui.template.get('roster')));

      if (jsxc.options.get('hideOffline')) {
         $('#jsxc_menu .jsxc_hideOffline').text($.t('Show_offline'));
         $('#jsxc_buddylist').addClass('jsxc_hideOffline');
      }

      $('#jsxc_menu .jsxc_settings').click(function() {
         jsxc.gui.showSettings();
      });

      $('#jsxc_menu .jsxc_hideOffline').click(function() {
         var hideOffline = !jsxc.options.get('hideOffline');

         if (hideOffline) {
            $('#jsxc_buddylist').addClass('jsxc_hideOffline');
         } else {
            $('#jsxc_buddylist').removeClass('jsxc_hideOffline');
         }

         $(this).text(hideOffline ? $.t('Show_offline') : $.t('Hide_offline'));

         jsxc.options.set('hideOffline', hideOffline);
      });

      if (jsxc.options.get('muteNotification')) {
         jsxc.notification.muteSound();
      }

      $('#jsxc_menu .jsxc_muteNotification').click(function() {

         if (jsxc.storage.getUserItem('presence') === 'dnd') {
            return;
         }

         // invert current choice
         var mute = !jsxc.options.get('muteNotification');

         if (mute) {
            jsxc.notification.muteSound();
         } else {
            jsxc.notification.unmuteSound();
         }
      });

      $('#jsxc_roster .jsxc_addBuddy').click(function() {
         jsxc.gui.showContactDialog();
      });

      $('#jsxc_roster .jsxc_onlineHelp').click(function() {
         window.open("http://www.jsxc.org/manual.html", "onlineHelp");
      });

      $('#jsxc_roster .jsxc_about').click(function() {
         jsxc.gui.showAboutDialog();
      });

      $('#jsxc_toggleRoster').click(function() {
         jsxc.gui.roster.toggle();
      });

      $('#jsxc_presence > ul > li').click(function() {
         var self = $(this);
         var pres = self.data('pres');

         if (pres === 'offline') {
            jsxc.xmpp.logout(false);
         } else {
            jsxc.gui.changePresence(pres);
         }
      });

      $('#jsxc_buddylist').slimScroll({
         distance: '3px',
         height: ($('#jsxc_roster').height() - 31) + 'px',
         width: $('#jsxc_buddylist').width() + 'px',
         color: '#fff',
         opacity: '0.5'
      });

      $('#jsxc_roster > .jsxc_bottom > div').each(function() {
         jsxc.gui.toggleList.call($(this));
      });

      var rosterState = jsxc.storage.getUserItem('roster') || (jsxc.options.get('loginForm').startMinimized ? 'hidden' : 'shown');

      $('#jsxc_roster').addClass('jsxc_state_' + rosterState);

      if (rosterState === 'hidden') {
         $('#jsxc_roster').css('right', -1 * $('#jsxc_roster').innerWidth() + 'px');
         $('#jsxc_windowList').css('right', '10px');
      }

      var pres = jsxc.storage.getUserItem('presence') || 'online';
      $('#jsxc_presence > span').text($('#jsxc_presence > ul .jsxc_' + pres).text());
      jsxc.gui.updatePresence('own', pres);

      jsxc.gui.tooltip('#jsxc_roster');

      jsxc.notice.load();

      jsxc.gui.roster.ready = true;
      $(document).trigger('ready.roster.jsxc');
   },

   /**
    * Create roster item and add it to the roster
    * 
    * @param {String} bid bar jid
    */
   add: function(bid) {
      var data = jsxc.storage.getUserItem('buddy', bid);
      var bud = jsxc.gui.buddyTemplate.clone().attr('data-bid', bid).attr('data-type', data.type || 'chat');

      jsxc.gui.roster.insert(bid, bud);

      bud.click(function() {
         jsxc.gui.window.open(bid);
      });

      bud.find('.jsxc_chaticon').click(function() {
         jsxc.gui.window.open(bid);
      });

      bud.find('.jsxc_rename').click(function() {
         jsxc.gui.roster.rename(bid);
         return false;
      });

      if (data.type !== 'groupchat') {
         bud.find('.jsxc_delete').click(function() {
            jsxc.gui.showRemoveDialog(bid);
            return false;
         });
      }

      var expandClick = function() {
         bud.trigger('extra.jsxc');

         bud.toggleClass('jsxc_expand');

         jsxc.gui.updateAvatar(bud, data.jid, data.avatar);
         return false;
      };

      bud.find('.jsxc_control').click(expandClick);
      bud.dblclick(expandClick);

      bud.find('.jsxc_vcardicon').click(function() {
         jsxc.gui.showVcard(data.jid);
         return false;
      });

      jsxc.gui.update(bid);

      // update scrollbar
      $('#jsxc_buddylist').slimScroll({
         scrollTo: '0px'
      });

      $(document).trigger('add.roster.jsxc', [bid, data, bud]);
   },

   getItem: function(bid) {
      return $("#jsxc_buddylist > li[data-bid='" + bid + "']");
   },

   /**
    * Insert roster item. First order: online > away > offline. Second order:
    * alphabetical of the name
    * 
    * @param {type} bid
    * @param {jquery} li roster item which should be insert
    * @returns {undefined}
    */
   insert: function(bid, li) {

      var data = jsxc.storage.getUserItem('buddy', bid);
      var listElements = $('#jsxc_buddylist > li');
      var insert = false;

      // Insert buddy with no mutual friendship to the end
      var status = (data.sub === 'both') ? data.status : -1;

      listElements.each(function() {

         var thisStatus = ($(this).data('sub') === 'both') ? $(this).data('status') : -1;

         if (($(this).data('name').toLowerCase() > data.name.toLowerCase() && thisStatus === status) || thisStatus < status) {

            $(this).before(li);
            insert = true;

            return false;
         }
      });

      if (!insert) {
         li.appendTo('#jsxc_buddylist');
      }
   },

   /**
    * Initiate reorder of roster item
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   reorder: function(bid) {
      jsxc.gui.roster.insert(bid, jsxc.gui.roster.remove(bid));
   },

   /**
    * Removes buddy from roster
    * 
    * @param {String} bid bar jid
    * @return {JQueryObject} Roster list element
    */
   remove: function(bid) {
      return jsxc.gui.roster.getItem(bid).detach();
   },

   /**
    * Removes buddy from roster and clean up
    * 
    * @param {String} bid bar compatible jid
    */
   purge: function(bid) {
      if (jsxc.master) {
         jsxc.storage.removeUserItem('buddy', bid);
         jsxc.storage.removeUserItem('otr', bid);
         jsxc.storage.removeUserItem('otr_version_' + bid);
         jsxc.storage.removeUserItem('chat', bid);
         jsxc.storage.removeUserItem('window', bid);
         jsxc.storage.removeUserElement('buddylist', bid);
         jsxc.storage.removeUserElement('windowlist', bid);
      }

      jsxc.gui.window._close(bid);
      jsxc.gui.roster.remove(bid);
   },

   /**
    * Create input element for rename action
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   rename: function(bid) {
      var name = jsxc.gui.roster.getItem(bid).find('.jsxc_name');
      var options = jsxc.gui.roster.getItem(bid).find('.jsxc_options, .jsxc_control, .jsxc_unread');
      var input = $('<input type="text" name="name"/>');

      options.hide();
      name = name.replaceWith(input);

      input.val(name.text());
      input.keypress(function(ev) {
         if (ev.which !== 13) {
            return;
         }

         options.css('display', '');
         input.replaceWith(name);
         jsxc.gui.roster._rename(bid, $(this).val());

         $('html').off('click');
      });

      // Disable html click event, if click on input
      input.click(function() {
         return false;
      });

      $('html').one('click', function() {
         options.css('display', '');
         input.replaceWith(name);
         jsxc.gui.roster._rename(bid, input.val());
      });
   },

   /**
    * Rename buddy
    * 
    * @param {type} bid
    * @param {type} newname new name of buddy
    * @returns {undefined}
    */
   _rename: function(bid, newname) {
      if (jsxc.master) {
         var d = jsxc.storage.getUserItem('buddy', bid) || {};

         if (d.type === 'chat') {
            var iq = $iq({
               type: 'set'
            }).c('query', {
               xmlns: 'jabber:iq:roster'
            }).c('item', {
               jid: Strophe.getBareJidFromJid(d.jid),
               name: newname
            });
            jsxc.xmpp.conn.sendIQ(iq);
         } else if (d.type === 'groupchat') {
            jsxc.xmpp.bookmarks.add(bid, newname, d.nickname, d.autojoin);
         }
      }

      jsxc.storage.updateUserItem('buddy', bid, 'name', newname);
      jsxc.gui.update(bid);
   },

   /**
    * Toogle complete roster
    * 
    * @param {Integer} d Duration in ms
    */
   toggle: function(d) {
      var duration = d || 500;

      var roster = $('#jsxc_roster');
      var wl = $('#jsxc_windowList');

      var roster_width = roster.innerWidth();
      var roster_right = parseFloat($('#jsxc_roster').css('right'));
      var state = (roster_right < 0) ? 'shown' : 'hidden';

      jsxc.storage.setUserItem('roster', state);

      roster.removeClass('jsxc_state_hidden jsxc_state_shown').addClass('jsxc_state_' + state);

      roster.animate({
         right: ((roster_width + roster_right) * -1) + 'px'
      }, duration);
      wl.animate({
         right: (10 - roster_right) + 'px'
      }, duration);

      $(document).trigger('toggle.roster.jsxc', [state, duration]);
   },

   /**
    * Shows a text with link to a login box that no connection exists.
    */
   noConnection: function() {
      $('#jsxc_roster').addClass('jsxc_noConnection');

      $('#jsxc_buddylist').empty();

      $('#jsxc_roster').append($('<p>' + $.t('no_connection') + '</p>').append(' <a>' + $.t('relogin') + '</a>').click(function() {
         jsxc.gui.showLoginBox();
      }));
   },

   /**
    * Shows a text with link to add a new buddy.
    * 
    * @memberOf jsxc.gui.roster
    */
   empty: function() {
      var text = $('<p>' + $.t('Your_roster_is_empty_add_') + '</p>');
      var link = text.find('a');

      link.click(function() {
         jsxc.gui.showContactDialog();
      });
      text.append(link);
      text.append('.');

      $('#jsxc_roster').prepend(text);
   }
};

/**
 * Wrapper for dialog
 * 
 * @namespace jsxc.gui.dialog
 */
jsxc.gui.dialog = {
   /**
    * Open a Dialog.
    * 
    * @memberOf jsxc.gui.dialog
    * @param {String} data Data of the dialog
    * @param {Object} [o] Options for the dialog
    * @param {Boolean} [o.noClose] If true, hide all default close options
    * @returns {jQuery} Dialog object
    */
   open: function(data, o) {

      var opt = o || {};

      $.magnificPopup.open({
         items: {
            src: '<div id="jsxc_dialog">' + data + '</div>'
         },
         type: 'inline',
         modal: opt.noClose,
         callbacks: {
            beforeClose: function() {
               $(document).trigger('cleanup.dialog.jsxc');
            },
            afterClose: function() {
               $(document).trigger('close.dialog.jsxc');
            },
            open: function() {
               $('#jsxc_dialog .jsxc_close').click(function(ev) {
                  ev.preventDefault();

                  jsxc.gui.dialog.close();
               });

               $('#jsxc_dialog form').each(function() {
                  var form = $(this);

                  form.find('button[data-jsxc-loading-text]').each(function() {
                     var btn = $(this);

                     btn.on('btnloading.jsxc', function() {
                        if (!btn.prop('disabled')) {
                           btn.prop('disabled', true);

                           btn.data('jsxc_value', btn.text());

                           btn.text(btn.attr('data-jsxc-loading-text'));
                        }
                     });

                     btn.on('btnfinished.jsxc', function() {
                        if (btn.prop('disabled')) {
                           btn.prop('disabled', false);

                           btn.text(btn.data('jsxc_value'));
                        }
                     });
                  });
               });

               jsxc.gui.dialog.resize();

               $(document).trigger('complete.dialog.jsxc');
            }
         }
      });

      return $('#jsxc_dialog');
   },

   /**
    * Close current dialog.
    */
   close: function() {
      jsxc.debug('close dialog');

      $.magnificPopup.close();
   },

   /**
    * Resizes current dialog.
    * 
    * @param {Object} options e.g. width and height
    */
   resize: function() {

   }
};

/**
 * Handle functions related to the gui of the window
 * 
 * @namespace jsxc.gui.window
 */
jsxc.gui.window = {
   /**
    * Init a window skeleton
    * 
    * @memberOf jsxc.gui.window
    * @param {String} bid
    * @returns {jQuery} Window object
    */
   init: function(bid) {
      if (jsxc.gui.window.get(bid).length > 0) {
         return jsxc.gui.window.get(bid);
      }

      var win = jsxc.gui.windowTemplate.clone().attr('data-bid', bid).hide().appendTo('#jsxc_windowList > ul').show('slow');
      var data = jsxc.storage.getUserItem('buddy', bid);

      // Attach jid to window
      win.data('jid', data.jid);

      // Add handler

      jsxc.gui.toggleList.call(win.find('.jsxc_settings'));

      win.find('.jsxc_verification').click(function() {
         jsxc.gui.showVerification(bid);
      });

      win.find('.jsxc_fingerprints').click(function() {
         jsxc.gui.showFingerprints(bid);
      });

      win.find('.jsxc_transfer').click(function() {
         jsxc.otr.toggleTransfer(bid);
      });

      win.find('.jsxc_bar').click(function() {
         jsxc.gui.window.toggle(bid);
      });

      win.find('.jsxc_close').click(function() {
         jsxc.gui.window.close(bid);
      });

      win.find('.jsxc_clear').click(function() {
         jsxc.gui.window.clear(bid);
      });

      win.find('.jsxc_tools').click(function() {
         return false;
      });

      win.find('.jsxc_textinput').keyup(function(ev) {
         var body = $(this).val();

         if (ev.which === 13) {
            body = '';
         }

         jsxc.storage.updateUserItem('window', bid, 'text', body);

         if (ev.which === 27) {
            jsxc.gui.window.close(bid);
         }
      }).keypress(function(ev) {
         if (ev.which !== 13 || !$(this).val()) {
            return;
         }

         jsxc.gui.window.postMessage(bid, 'out', $(this).val());

         $(this).val('');
      }).focus(function() {
         // remove unread flag
         jsxc.gui.readMsg(bid);
      }).mouseenter(function() {
         $('#jsxc_windowList').data('isOver', true);
      }).mouseleave(function() {
         $('#jsxc_windowList').data('isOver', false);
      });

      win.find('.jsxc_textarea').click(function() {
         // check if user clicks element or selects text
         if (typeof getSelection === 'function' && !getSelection().toString()) {
            win.find('.jsxc_textinput').focus();
         }
      });

      win.find('.jsxc_textarea').slimScroll({
         height: '234px',
         distance: '3px'
      });

      win.find('.jsxc_fade').hide();

      win.find('.jsxc_name').disableSelection();

      win.find('.slimScrollDiv').resizable({
         handles: 'w, nw, n',
         minHeight: 234,
         minWidth: 250,
         resize: function(event, ui) {
            win.width(ui.size.width);
            win.find('.jsxc_textarea').slimScroll({
               height: ui.size.height
            });
            var offset = win.find('.slimScrollDiv').position().top;
            win.find('.jsxc_emoticons').css('top', (ui.size.height + offset + 6) + 'px');

            $(document).trigger('resize.window.jsxc', [win, bid, ui.size]);
         }
      });

      if ($.inArray(bid, jsxc.storage.getUserItem('windowlist')) < 0) {

         // add window to windowlist
         var wl = jsxc.storage.getUserItem('windowlist');
         wl.push(bid);
         jsxc.storage.setUserItem('windowlist', wl);

         // init window element in storage
         jsxc.storage.setUserItem('window', bid, {
            minimize: true,
            text: '',
            unread: 0
         });
      } else {

         if (jsxc.storage.getUserItem('window', bid).unread) {
            jsxc.gui._unreadMsg(bid);
         }
      }

      $.each(jsxc.gui.emotions, function(i, val) {
         var ins = val[0].split(' ')[0];
         var li = $('<li><div title="' + ins + '" class="jsxc_' + val[1] + '"/></li>');
         li.click(function() {
            win.find('input').val(win.find('input').val() + ins);
            win.find('input').focus();
         });
         win.find('.jsxc_emoticons ul').append(li);
      });

      jsxc.gui.toggleList.call(win.find('.jsxc_emoticons'));

      jsxc.gui.window.restoreChat(bid);

      jsxc.gui.update(bid);

      jsxc.gui.updateWindowListSB();

      // create related otr object
      if (jsxc.master && !jsxc.otr.objects[bid]) {
         jsxc.otr.create(bid);
      } else {
         jsxc.otr.enable(bid);
      }

      $(document).trigger('init.window.jsxc', [win]);

      return win;
   },

   /**
    * Returns the window element
    * 
    * @param {String} bid
    * @returns {jquery} jQuery object of the window element
    */
   get: function(id) {
      return $("li.jsxc_windowItem[data-bid='" + jsxc.jidToBid(id) + "']");
   },

   /**
    * Open a window, related to the bid. If the window doesn't exist, it will be
    * created.
    * 
    * @param {String} bid
    * @returns {jQuery} Window object
    */
   open: function(bid) {
      var win = jsxc.gui.window.init(bid);
      jsxc.gui.window.show(bid);
      jsxc.gui.window.highlight(bid);

      var padding = $("#jsxc_windowListSB").width();
      var innerWidth = $('#jsxc_windowList>ul').width();
      var outerWidth = $('#jsxc_windowList').width() - padding;

      if (innerWidth > outerWidth) {
         var offset = parseInt($('#jsxc_windowList>ul').css('right'));
         var width = win.outerWidth(true);

         var right = innerWidth - win.position().left - width + offset;
         var left = outerWidth - (innerWidth - win.position().left) - offset;

         if (left < 0) {
            jsxc.gui.scrollWindowListBy(left * -1);
         }

         if (right < 0) {
            jsxc.gui.scrollWindowListBy(right);
         }
      }

      return win;
   },

   /**
    * Close chatwindow and clean up
    * 
    * @param {String} bid bar jid
    */
   close: function(bid) {

      if (jsxc.gui.window.get(bid).length === 0) {
         jsxc.warn('Want to close a window, that is not open.');
         return;
      }

      jsxc.storage.removeUserElement('windowlist', bid);
      jsxc.storage.removeUserItem('window', bid);

      if (jsxc.storage.getUserItem('buddylist').indexOf(bid) < 0) {
         // delete data from unknown sender

         jsxc.storage.removeUserItem('buddy', bid);
         jsxc.storage.removeUserItem('chat', bid);
      }

      jsxc.gui.window._close(bid);
   },

   /**
    * Close chatwindow
    * 
    * @param {String} bid
    */
   _close: function(bid) {
      jsxc.gui.window.get(bid).hide('slow', function() {
         $(this).remove();

         jsxc.gui.updateWindowListSB();
      });
   },

   /**
    * Toggle between minimize and maximize of the text area
    * 
    * @param {String} bid bar jid
    */
   toggle: function(bid) {

      var win = jsxc.gui.window.get(bid);

      if (win.parents("#jsxc_windowList").length === 0) {
         return;
      }

      if (win.find('.jsxc_fade').is(':hidden')) {
         jsxc.gui.window.show(bid);
      } else {
         jsxc.gui.window.hide(bid);
      }

      jsxc.gui.updateWindowListSB();
   },

   /**
    * Maximize text area and save
    * 
    * @param {String} bid
    */
   show: function(bid) {

      jsxc.storage.updateUserItem('window', bid, 'minimize', false);

      jsxc.gui.window._show(bid);
   },

   /**
    * Maximize text area
    * 
    * @param {String} bid
    * @returns {undefined}
    */
   _show: function(bid) {
      var win = jsxc.gui.window.get(bid);
      jsxc.gui.window.get(bid).find('.jsxc_fade').slideDown();
      win.removeClass('jsxc_min');

      // If the area is hidden, the scrolldown function doesn't work. So we
      // call it here.
      jsxc.gui.window.scrollDown(bid);

      if (jsxc.restoreCompleted) {
         win.find('.jsxc_textinput').focus();
      }

      win.trigger('show.window.jsxc');
   },

   /**
    * Minimize text area and save
    * 
    * @param {String} bid
    */
   hide: function(bid) {
      jsxc.storage.updateUserItem('window', bid, 'minimize', true);

      jsxc.gui.window._hide(bid);
   },

   /**
    * Minimize text area
    * 
    * @param {String} bid
    */
   _hide: function(bid) {
      jsxc.gui.window.get(bid).addClass('jsxc_min').find(' .jsxc_fade').slideUp();

      jsxc.gui.window.get(bid).trigger('hidden.window.jsxc');
   },

   /**
    * Highlight window
    * 
    * @param {type} bid
    */
   highlight: function(bid) {
      var el = jsxc.gui.window.get(bid).find(' .jsxc_bar');

      if (!el.is(':animated')) {
         el.effect('highlight', {
            color: 'orange'
         }, 2000);
      }
   },

   /**
    * Scroll chat area to the bottom
    * 
    * @param {String} bid bar jid
    */
   scrollDown: function(bid) {
      var chat = jsxc.gui.window.get(bid).find('.jsxc_textarea');

      // check if chat exist
      if (chat.length === 0) {
         return;
      }

      chat.slimScroll({
         scrollTo: (chat.get(0).scrollHeight + 'px')
      });
   },

   /**
    * Write Message to chat area and save
    * 
    * @param {String} bid bar jid
    * @param {String} direction 'in' message is received or 'out' message is
    *        send
    * @param {String} msg Message to display
    * @param {boolean} encrypted Was this message encrypted? Default: false
    * @param {boolean} forwarded Was this message forwarded? Default: false
    * @param {integer} stamp Timestamp
    * @param {object} sender Information about sender
    * @property {string} sender.jid Sender Jid
    * @property {string} sender.name Sender name or nickname
    */
   postMessage: function(bid, direction, msg, encrypted, forwarded, stamp, sender) {
      var data = jsxc.storage.getUserItem('buddy', bid);
      var html_msg = msg;

      // remove html tags and reencode html tags
      msg = jsxc.removeHTML(msg);
      msg = jsxc.escapeHTML(msg);

      // exceptions:

      if (direction === 'out' && data.msgstate === OTR.CONST.MSGSTATE_FINISHED && forwarded !== true) {
         direction = 'sys';
         msg = $.t('your_message_wasnt_send_please_end_your_private_conversation');
      }

      if (direction === 'in' && data.msgstate === OTR.CONST.MSGSTATE_FINISHED) {
         direction = 'sys';
         msg = $.t('unencrypted_message_received') + ' ' + msg;
      }

      encrypted = encrypted || data.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED;
      var post = jsxc.storage.saveMessage(bid, direction, msg, encrypted, forwarded, stamp, sender);

      if (direction === 'in') {
         jsxc.gui.unreadMsg(bid);

         $(document).trigger('postmessagein.jsxc', [bid, html_msg]);
      }

      if (direction === 'out' && jsxc.master && forwarded !== true) {
         jsxc.xmpp.sendMessage(bid, html_msg, post.uid);
      }

      jsxc.gui.window._postMessage(bid, post);

      if (direction === 'out' && msg === '?') {
         jsxc.gui.window.postMessage(bid, 'sys', '42');
      }
   },

   /**
    * Write Message to chat area
    * 
    * @param {String} bid bar jid
    * @param {Object} post Post object with direction, msg, uid, received
    * @param {Bool} restore If true no highlights are used
    */
   _postMessage: function(bid, post, restore) {
      var win = jsxc.gui.window.get(bid);
      var msg = post.msg;
      var direction = post.direction;
      var uid = post.uid;

      if (win.find('.jsxc_textinput').is(':not(:focus)') && direction === 'in' && !restore) {
         jsxc.gui.window.highlight(bid);
      }

      msg = msg.replace(jsxc.CONST.REGEX.URL, function(url) {

         var href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

         return '<a href="' + href + '" target="_blank">' + url + '</a>';
      });

      msg = msg.replace(new RegExp('(xmpp:)?(' + jsxc.CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i'), function(match, protocol, jid, action) {
         if (protocol === 'xmpp:') {
            if (typeof action === 'string') {
               jid += action;
            }

            return '<a href="xmpp:' + jid + '">' + jid + '</a>';
         }

         return '<a href="mailto:' + jid + '" target="_blank">' + jid + '</a>';
      });

      $.each(jsxc.gui.emotions, function(i, val) {
         msg = msg.replace(val[2], function(match, p1) {

            // escape value for alt and title, this prevents double
            // replacement
            var esc = '',
               i;
            for (i = 0; i < p1.length; i++) {
               esc += '&#' + p1.charCodeAt(i) + ';';
            }

            return '<div title="' + esc + '" class="jsxc_emoticon jsxc_' + val[1] + '"/>';
         });
      });

      var msgDiv = $("<div>"),
         msgTsDiv = $("<div>");
      msgDiv.addClass('jsxc_chatmessage jsxc_' + direction);
      msgDiv.attr('id', uid);
      msgDiv.html('<div>' + msg + '</div>');
      msgTsDiv.addClass('jsxc_timestamp');
      msgTsDiv.text(jsxc.getFormattedTime(post.stamp));

      if (post.received || false) {
         msgDiv.addClass('jsxc_received');
      }

      if (post.forwarded) {
         msgDiv.addClass('jsxc_forwarded');
      }

      if (post.encrypted) {
         msgDiv.addClass('jsxc_encrypted');
      }

      if (direction === 'sys') {
         jsxc.gui.window.get(bid).find('.jsxc_textarea').append('<div style="clear:both"/>');
      } else if (typeof post.stamp !== 'undefined') {
         msgDiv.append(msgTsDiv);
      }

      win.find('.jsxc_textarea').append(msgDiv);

      if (typeof post.sender === 'object' && post.sender !== null) {
         var title = '';
         var avatarDiv = $('<div>');
         avatarDiv.addClass('jsxc_avatar').prependTo(msgDiv);

         if (typeof post.sender.jid === 'string') {
            msgDiv.attr('data-bid', jsxc.jidToBid(post.sender.jid));

            var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(post.sender.jid)) || {};
            jsxc.gui.updateAvatar(msgDiv, jsxc.jidToBid(post.sender.jid), data.avatar);

            title = jsxc.jidToBid(post.sender.jid);
         }

         if (typeof post.sender.name === 'string') {
            msgDiv.attr('data-name', post.sender.name);

            if (typeof post.sender.jid !== 'string') {
               jsxc.gui.avatarPlaceholder(avatarDiv, post.sender.name);
            }

            if (title !== '') {
               title = '\n' + title;
            }

            title = post.sender.name + title;

            msgTsDiv.text(msgTsDiv.text() + ' ' + post.sender.name);
         }

         avatarDiv.attr('title', jsxc.escapeHTML(title));
      }

      jsxc.gui.detectUriScheme(win);
      jsxc.gui.detectEmail(win);

      jsxc.gui.window.scrollDown(bid);
   },

   /**
    * Set text into input area
    * 
    * @param {type} bid
    * @param {type} text
    * @returns {undefined}
    */
   setText: function(bid, text) {
      jsxc.gui.window.get(bid).find('.jsxc_textinput').val(text);
   },

   /**
    * Load old log into chat area
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   restoreChat: function(bid) {
      var chat = jsxc.storage.getUserItem('chat', bid);

      while (chat !== null && chat.length > 0) {
         var c = chat.pop();
         jsxc.gui.window._postMessage(bid, c, true);
      }
   },

   /**
    * Clear chat history
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   clear: function(bid) {
      jsxc.storage.setUserItem('chat', bid, []);
      jsxc.gui.window.get(bid).find('.jsxc_textarea').empty();
   }
};

jsxc.gui.template = {};

/**
 * Return requested template and replace all placeholder
 * 
 * @memberOf jsxc.gui.template;
 * @param {type} name template name
 * @param {type} bid
 * @param {type} msg
 * @returns {String} HTML Template
 */
jsxc.gui.template.get = function(name, bid, msg) {

   // common placeholder
   var ph = {
      my_priv_fingerprint: jsxc.storage.getUserItem('priv_fingerprint') ? jsxc.storage.getUserItem('priv_fingerprint').replace(/(.{8})/g, '$1 ') : $.t('not_available'),
      my_jid: jsxc.storage.getItem('jid') || '',
      my_node: Strophe.getNodeFromJid(jsxc.storage.getItem('jid') || '') || '',
      root: jsxc.options.root,
      app_name: jsxc.options.app_name,
      version: jsxc.version
   };

   // placeholder depending on bid
   if (bid) {
      var data = jsxc.storage.getUserItem('buddy', bid);

      $.extend(ph, {
         bid_priv_fingerprint: (data && data.fingerprint) ? data.fingerprint.replace(/(.{8})/g, '$1 ') : $.t('not_available'),
         bid_jid: bid,
         bid_name: (data && data.name) ? data.name : bid
      });
   }

   // placeholder depending on msg
   if (msg) {
      $.extend(ph, {
         msg: msg
      });
   }

   var ret = jsxc.gui.template[name];

   if (typeof(ret) === 'string') {
      // prevent 404
      ret = ret.replace(/\{\{root\}\}/g, ph.root);

      // convert to string
      ret = $('<div>').append($(ret).i18n()).html();

      // replace placeholders
      ret = ret.replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, function(s, key) {
         return (typeof ph[key] === 'string') ? ph[key] : s;
      });

      return ret;
   }

   jsxc.debug('Template not available: ' + name);
   return name;
};
