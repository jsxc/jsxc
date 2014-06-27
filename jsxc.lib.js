var jsxc;

(function($) {
   "use strict";

   /**
    * JavaScript Xmpp Chat namespace
    * 
    * @namespace jsxc
    */
   jsxc = {
      /** Version of jsxc */
      version: '< $ app.version $ >',

      /** True if i'm the master */
      master: false,

      /** True if the role allocation is finished */
      role_allocation: false,

      /** Timeout for keepalive */
      to: null,

      /** Timeout after normal keepalive starts */
      toBusy: null,

      /** Timeout for notification */
      toNotification: null,

      /** Interval for keep-alive */
      keepalive: null,

      /** list of otr objects */
      buddyList: {},

      /** True if last activity was 10 min ago */
      restore: false,

      /** True if restore is complete */
      restoreCompleted: false,

      /** True if login through form */
      triggeredFromForm: false,

      /** True if login through box */
      triggeredFromBox: false,

      /** True if logout through element click */
      triggeredFromElement: false,

      /** True if logout through logout click */
      triggeredFromLogout: false,

      /** last values which we wrote into localstorage (IE workaround) */
      ls: [],

      /**
       * storage event is even fired if I write something into storage (IE
       * workaround) 0: conform, 1: not conform, 2: not shure
       */
      storageNotConform: null,

      /** Timeout for storageNotConform test */
      toSNC: null,

      /** css id to jid list */
      jids: [],

      /** My css id */
      cid: null,

      /** Some constants */
      CONST: {
         NOTIFICATION_DEFAULT: 'default',
         NOTIFICATION_GRANTED: 'granted',
         NOTIFICATION_DENIED: 'denied',
         STATUS: [ 'offline', 'dnd', 'xa', 'away', 'chat', 'online' ],
         SOUNDS: {
            MSG: 'incomingMessage.wav',
            CALL: 'Rotary-Phone6.mp3',
            NOTICE: 'Ping1.mp3'
         }
      },

      /**
       * Write debug message to console and to log.
       * 
       * @memberOf jsxc
       * @param {String} msg Debug message
       * @param {Object} data
       * @param {String} Could be warn|error|null
       */
      debug: function(msg, data, level) {
         if (level) {
            msg = '[' + level + '] ' + msg;
         }

         if (data) {
            console.log(msg, data);

            // try to convert data to string
            var d;
            try {
               // clone html snippet
               d = $("<span>").prepend($(data).clone()).html();
            } catch (err) {
               try {
                  d = JSON.stringify(data);
               } catch (err2) {
                  d = 'see js console';
               }
            }

            jsxc.log = jsxc.log + msg + ': ' + d + '\n';
         } else {
            console.log(msg);
            jsxc.log = jsxc.log + msg + '\n';
         }
      },

      /**
       * Write warn message.
       * 
       * @memberOf jsxc
       * @param {String} msg Warn message
       * @param {Object} data
       */
      warn: function(msg, data) {
         jsxc.debug(msg, data, 'WARN');
      },

      /**
       * Write error message.
       * 
       * @memberOf jsxc
       * @param {String} msg Error message
       * @param {Object} data
       */
      error: function(msg, data) {
         jsxc.debug(msg, data, 'ERROR');
      },

      /** debug log */
      log: '',

      /**
       * Starts the action
       * 
       * @memberOf jsxc
       * @param {object} options
       */
      init: function(options) {

         if (options) {
            // override default options
            $.extend(jsxc.options, options);
         }

         /**
          * Getter method for options. Saved options will override default one.
          * 
          * @param {string} key option key
          * @returns default or saved option value
          */
         jsxc.options.get = function(key) {
            var local = jsxc.storage.getUserItem('options') || {};

            return local[key] || options[key];
         };

         /**
          * Setter method for options. Will write into localstorage.
          * 
          * @param {string} key option key
          * @param {object} value option value
          */
         jsxc.options.set = function(key, value) {
            jsxc.storage.updateUserItem('options', key, value);
         };

         jsxc.storageNotConform = jsxc.storage.getItem('storageNotConform');
         if (jsxc.storageNotConform === null) {
            jsxc.storageNotConform = 2;
         }

         // detect language
         var lang;
         if (jsxc.storage.getItem('lang') !== null) {
            lang = jsxc.storage.getItem('lang');
         } else if (jsxc.options.autoLang && navigator.language) {
            lang = navigator.language.substr(0, 2);
         } else {
            lang = jsxc.options.defaultLang;
         }

         // set language
         jsxc.l = jsxc.l10n.en;
         $.extend(jsxc.l, jsxc.l10n[lang]);

         // Check localStorage
         if (typeof (localStorage) === 'undefined') {
            jsxc.debug("Browser doesn't support localStorage.");
            return;
         }

         // Check flash
         if (jsxc.options.checkFlash && !jsxc.hasFlash()) {
            jsxc.debug("No flash plugin for cross-domain requests.");
            return;
         }

         // Register event listener for the storage event
         window.addEventListener('storage', jsxc.storage.onStorage, false);

         var lastActivity = jsxc.storage.getItem('lastActivity') || 0;

         if ((new Date()).getTime() - lastActivity < jsxc.options.loginTimeout) {
            jsxc.restore = true;
         }

         // Check if we have to establish a new connection
         if (!jsxc.storage.getItem('rid') || !jsxc.storage.getItem('sid') || !jsxc.restore) {

            // Looking for a login form
            if (!jsxc.options.loginForm.form || !(jsxc.el_exists(jsxc.options.loginForm.form) && jsxc.el_exists(jsxc.options.loginForm.jid) && jsxc.el_exists(jsxc.options.loginForm.pass))) {

               if (jsxc.options.displayRosterMinimized()) {
                  // Show minimized roster
                  jsxc.storage.setUserItem('roster', 'hidden');
                  jsxc.gui.roster.init();
                  jsxc.gui.roster.noConnection();
               }

               return;
            }

            if (typeof jsxc.options.formFound === 'function') {
               jsxc.options.formFound.call();
            }

            // create jquery object
            var form = jsxc.options.loginForm.form = $(jsxc.options.loginForm.form);
            var events = form.data('events') || {
               submit: []
            };
            var submits = [];

            // save attached submit events and remove them. Will be reattached
            // in jsxc.submitLoginForm
            $.each(events.submit, function(index, val) {
               submits.push(val.handler);
            });

            form.data('submits', submits);
            form.off('submit');

            // Add jsxc login action to form
            form.submit(function() {

               jsxc.gui.showWaitAlert(jsxc.l.please_wait_until_we_logged_you_in);

               jsxc.options.xmpp.jid = jsxc.options.loginForm.preJid($(jsxc.options.loginForm.jid).val());
               jsxc.options.xmpp.password = $(jsxc.options.loginForm.pass).val();

               jsxc.triggeredFromForm = true;

               jsxc.xmpp.login();

               // Trigger submit in jsxc.xmpp.connected()
               return false;
            });

         } else {

            // Restore old connection

            jsxc.cid = jsxc.jidToCid(jsxc.storage.getItem('jid'));

            jsxc.gui.init();

            // Looking for logout element
            if (jsxc.options.logoutElement !== null && jsxc.options.logoutElement.length > 0) {
               jsxc.options.logoutElement.one('click', function() {
                  jsxc.options.logoutElement = $(this);
                  jsxc.triggeredFromLogout = true;
                  return jsxc.xmpp.logout();
               });
            }

            if (typeof (jsxc.storage.getItem('alive')) === 'undefined' || !jsxc.restore) {
               jsxc.onMaster();
            } else {
               jsxc.checkMaster();
            }
         }
      },

      /**
       * Checks if flash is available
       * 
       * @memberOf jsxc
       * @return {boolean} True if flash is available
       */
      hasFlash: function() {
         return (typeof (navigator.plugins) === "undefined" || navigator.plugins.length === 0) ? !!(new ActiveXObject("ShockwaveFlash.ShockwaveFlash")) : navigator.plugins["Shockwave Flash"];
      },

      /**
       * Called if the script is a slave
       */
      onSlave: function() {
         jsxc.debug('I am the slave.');

         jsxc.role_allocation = true;

         jsxc.restoreRoster();
         jsxc.restoreWindows();
         jsxc.restoreCompleted = true;
      },

      /**
       * Called if the script is the master
       */
      onMaster: function() {
         jsxc.debug('I am master.');

         jsxc.master = true;

         // Init local storage
         jsxc.storage.setItem('alive', 0);
         jsxc.storage.setItem('alive_busy', 0);
         if (!jsxc.storage.getUserItem('windowlist')) {
            jsxc.storage.setUserItem('windowlist', []);
         }

         // Sending keepalive signal
         jsxc.startKeepAlive();

         // create or load DSA key and call _onMaster
         jsxc.otr.createDSA();
      },

      /**
       * Second half of the onMaster routine
       */
      _onMaster: function() {

         // create otr objects, if we lost the master
         if (jsxc.role_allocation) {
            $.each(jsxc.storage.getUserItem('windowlist'), function(index, val) {
               jsxc.otr.create(val);
            });
         }

         jsxc.role_allocation = true;

         if (jsxc.restore && !jsxc.restoreCompleted) {
            jsxc.restoreRoster();
            jsxc.restoreWindows();
            jsxc.restoreCompleted = true;
         }

         // Prepare notifications
         if (jsxc.restore) {
            var noti = jsxc.storage.getUserItem('notification') || 2;
            if (jsxc.options.notification && noti > 0 && jsxc.notification.hasSupport()) {
               if (jsxc.notification.hasPermission()) {
                  jsxc.notification.init();
               } else {
                  jsxc.notification.prepareRequest();
               }
            } else {
               // No support => disable
               jsxc.options.notification = false;
            }
         }

         jsxc.xmpp.login();
      },

      /**
       * Checks if there is a master
       */
      checkMaster: function() {
         jsxc.debug('check master');
         jsxc.to = window.setTimeout(jsxc.onMaster, 1000);
         jsxc.storage.ink('alive');
      },

      /**
       * Start sending keep-alive signal
       */
      startKeepAlive: function() {
         jsxc.keepalive = window.setInterval(jsxc.keepAlive, jsxc.options.timeout - 1000);
      },

      /**
       * Sends the keep-alive signal to signal that the master is still there.
       */
      keepAlive: function() {
         jsxc.storage.ink('alive');

         if (jsxc.role_allocation) {
            jsxc.storage.setItem('lastActivity', (new Date()).getTime());
         }
      },

      /**
       * Send one keep-alive signal with higher timeout, and than resume with
       * normal signal
       */
      keepBusyAlive: function() {
         if (jsxc.toBusy) {
            window.clearTimeout(jsxc.toBusy);
         }

         if (jsxc.keepalive) {
            window.clearInterval(jsxc.keepalive);
         }

         jsxc.storage.ink('alive_busy');
         jsxc.toBusy = window.setTimeout(jsxc.startKeepAlive, jsxc.options.busyTimeout - 1000);
      },

      /**
       * Generates a random integer number between 0 and max
       * 
       * @param {Integer} max
       * @return {Integer} random integer between 0 and max
       */
      random: function(max) {
         return Math.floor(Math.random() * max);
      },

      /**
       * Checks if there is a element with the given selector
       * 
       * @param {String} selector jQuery selector
       * @return {Boolean}
       */
      el_exists: function(selector) {
         return $(selector).length > 0;
      },

      /**
       * Creates a CSS compatible string from a JID
       * 
       * @param {type} jid Valid Jabber ID
       * @returns {String} css Compatible string
       */
      jidToCid: function(jid) {
         var cid = Strophe.getBareJidFromJid(jid).replace('@', '-').replace(/\./g, '-').toLowerCase();

         jsxc.jids[cid] = jid;

         return cid;
      },

      /**
       * Restore roster
       */
      restoreRoster: function() {
         var buddies = jsxc.storage.getUserItem('buddylist');

         if (!buddies || buddies.length === 0) {
            jsxc.debug('No saved buddylist.');
            
            jsxc.gui.roster.empty();

            return;
         }

         $.each(buddies, function(index, value) {
            jsxc.gui.roster.add(value);
         });

         $(document).trigger('cloaded.roster.jsxc');
      },

      /**
       * Restore all windows
       */
      restoreWindows: function() {
         var windows = jsxc.storage.getUserItem('windowlist');

         if (windows === null) {
            return;
         }

         $.each(windows, function(index, cid) {
            var window = jsxc.storage.getUserItem('window_' + cid);

            if (!window) {
               jsxc.debug('Associated window-element is missing: ' + cid);
               return true;
            }

            jsxc.gui.window.init(cid);

            if (!window.minimize) {
               jsxc.gui.window.show(cid);
            } else {
               jsxc.gui.window.hide(cid);
            }

            jsxc.gui.window.setText(cid, window.text);
         });
      },

      /**
       * This method submits the specified login form.
       */
      submitLoginForm: function() {
         var form = jsxc.options.loginForm.form.off('submit');

         // Attach original events
         var submits = form.data('submits') || [];
         $.each(submits, function(index, val) {
            form.submit(val);
         });

         if (form.find('#submit')) {
            form.find('#submit').click();
         } else {
            form.submit();
         }
      },

      /**
       * Escapes some characters to HTML character
       */
      escapeHTML: function(text) {
         text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
         return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      },

      /**
       * Executes only one of the given events
       * 
       * @param {string} obj.key event name
       * @param {function} obj.value function to execute
       * @returns {string} namespace of all events
       */
      switchEvents: function(obj) {
         var ns = Math.random().toString(36).substr(2, 12);
         var self = this;

         $.each(obj, function(key, val) {
            $(document).one(key + '.' + ns, function() {
               $(document).off('.' + ns);

               val.apply(self, arguments);
            });
         });

         return ns;
      },

      /**
       * Checks if tab is hidden.
       * 
       * @returns {boolean} True if tab is hidden
       */
      isHidden: function() {
         var hidden = document.hidden || document.webkitHidden || document.mozHidden || document.msHidden;

         // handle multiple tabs
         if (hidden && jsxc.master) {
            jsxc.storage.ink('hidden', 0);
         } else if (!hidden && !jsxc.master) {
            jsxc.storage.ink('hidden');
         }

         return hidden;
      },

      /**
       * Replace %%tokens%% with correct translation.
       * 
       * @param {String} text Given text
       * @returns {String} Translated string
       */
      translate: function(text) {
         return text.replace(/%%([a-zA-Z0-9_-}{ .!,?/'@]+)%%/g, function(s, key) {
            var k = key.replace(/ /gi, '_').replace(/[.!,?/'@]/g, '');

            if (!jsxc.l[k]) {
               jsxc.warn('No translation for: ' + k);
            }

            return jsxc.l[k] || key.replace(/_/g, ' ');
         });
      }
   };

   /**
    * Set some options for the chat
    */
   jsxc.options = {
      /** Timeout for the keepalive signal */
      timeout: 3000,

      /** Timeout for the keepalive signal if the master is busy */
      busyTimeout: 15000,

      /** OTR options (see [2]) */
      otr: {
         debug: true
      },

      /** xmpp options (see [1]) */
      xmpp: {
         url: null,
         jid: null,
         password: null
      },

      /** If all 3 properties are set, the login form is used */
      loginForm: {
         /** jquery object from form */
         form: null,

         /** jquery object from input element which contains the jid */
         jid: null,

         /** jquery object from input element which contains the password */
         pass: null,

         /** manipulate JID from input element */
         preJid: function(jid) {
            return jid;
         }
      },

      /** jquery object from logout element */
      logoutElement: null,

      /**
       * Debug function: Expects two parameter (msg, debug)
       * 
       * @memberOf jsxc.options
       * @param {String} msg Message
       * @param {Object} debug Object
       */
      debug: function() {
      },

      /** If false, the application may crash, if the user didn't install flash */
      checkFlash: true,

      /** How many messages should be logged? */
      numberOfMsg: 10,

      /** Default language */
      defaultLang: 'en',

      /** auto language detection */
      autoLang: true,

      /** Place for roster */
      rosterAppend: 'body',

      /** Should we use the HTML5 notification API? */
      notification: true,

      /** duration for notification */
      popupDuration: 6000,

      /** Path root of JSXC installation */
      root: '',

      /** Timeout for restore in ms */
      loginTimeout: 1000 * 60 * 10,

      /**
       * This function decides wether the roster will be displayed or not if no
       * connection is found.
       */
      displayRosterMinimized: function() {
         return false;
      },

      /** Set to true if you want to hide offline buddies. */
      hideOffline: false,

      /**
       * If no avatar is found, this function is called.
       * 
       * @param jid Jid of that user.
       * @this {jQuery} Elements to update with probable .jsxc_avatar elements
       */
      defaultAvatar: function() {

      }
   };

   /**
    * Handle functions for chat window's and buddylist
    * 
    * @namespace jsxc.gui
    */
   jsxc.gui = {
      /** Smilie token to file mapping */
      emotions: [ [ 'O:-) O:)', 'angel.png' ], [ '>:-( >:( &gt;:-( &gt;:(', 'angry.png' ], [ ':-) :)', 'smile.png' ], [ ':-D :D', 'grin.png' ], [ ':-( :(', 'sad.png' ], [ ';-) ;)', 'wink.png' ], [ ':-P :P', 'tonguesmile.png' ], [ '=-O', 'surprised.png' ], [ ':kiss: :-*', 'kiss.png' ], [ '8-) :cool:', 'sunglassess.png' ], [ ':\'-( :\'( :&amp;apos;-(', 'crysad.png' ], [ ':-/', 'doubt.png' ], [ ':-X :X', 'zip.png' ], [ ':yes:', 'thumbsup.png' ], [ ':no:', 'thumbsdown.png' ], [ ':beer:', 'beer.png' ], [ ':devil:', 'devil.png' ], [ ':kiss: :kissing:', 'kissing.png' ], [ '@->-- :rose: @-&gt;--', 'rose.png' ], [ ':music:', 'music.png' ], [ ':love:', 'love.png' ], [ ':zzz:', 'tired.png' ] ],

      /**
       * Creates application skeleton.
       * 
       * @memberOf jsxc.gui
       */
      init: function() {
         $('body').append($(jsxc.gui.template.get('windowList')));

         jsxc.gui.tooltip('#jsxc_windowList');

         jsxc.gui.roster.init();

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
       * @param {String} cid CSS compatible jid
       */
      update: function(cid) {
         var data = jsxc.storage.getUserItem('buddy_' + cid);

         if (!data) {
            jsxc.debug('No data for ' + cid);
            return;
         }

         var ri = $('#' + cid); // roster item from user
         var we = jsxc.gui.getWindow(cid); // window element from user
         var ue = $('#' + cid + ', #jsxc_window_' + cid + ', .jsxc_buddy_' + cid); // both
         var bullet = $('.jsxc_buddy_' + cid);

         // Attach data to corresponding roster item
         ri.data(data);

         // Add online status
         ue.removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + jsxc.CONST.STATUS[data.status]);

         // Change name and add title
         ue.find('.jsxc_name').text(data.name).attr('title', 'is ' + jsxc.CONST.STATUS[data.status]);
         bullet.attr('title', 'is ' + jsxc.CONST.STATUS[data.status]);

         // Update gui according to encryption state
         switch (data.msgstate) {
            case 0:
               we.find('.jsxc_transfer').removeClass('jsxc_enc jsxc_fin').attr('title', jsxc.l.your_connection_is_unencrypted);
               we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
               we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.start_private);
               break;
            case 1:
               we.find('.jsxc_transfer').addClass('jsxc_enc').attr('title', jsxc.l.your_connection_is_encrypted);
               we.find('.jsxc_settings .jsxc_verification').removeClass('jsxc_disabled');
               we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.close_private);
               break;
            case 2:
               we.find('.jsxc_settings .jsxc_verification').addClass('jsxc_disabled');
               we.find('.jsxc_transfer').removeClass('jsxc_enc').addClass('jsxc_fin').attr('title', jsxc.l.your_buddy_closed_the_private_connection);
               we.find('.jsxc_settings .jsxc_transfer').text(jsxc.l.close_private);
               break;
         }

         // update gui according to verification state
         if (data.trust) {
            we.find('.jsxc_transfer').addClass('jsxc_trust').attr('title', jsxc.l.your_buddy_is_verificated);
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
         info += jsxc.translate('%%Subscription%%: %%' + data.sub + '%%\n');
         info += jsxc.translate('%%Status%%: %%' + jsxc.CONST.STATUS[data.status] + '%%');

         ri.find('.jsxc_name').attr('title', info);

         if (data.avatar && data.avatar.length > 0) {
            jsxc.gui.updateAvatar(ue, data.jid, data.avatar);
         } else {
            jsxc.options.defaultAvatar.call(ue, data.jid);
         }
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
         var avatarSrc = jsxc.storage.getUserItem('avatar_' + aid);

         var setAvatar = function(src) {
            if (src === 0) {
               jsxc.options.defaultAvatar.call(el, jid);
               return;
            }

            el.find('.jsxc_avatar').removeAttr('style');
            el.find('.jsxc_avatar img').remove();
            var img = $('<img/>').attr('alt', 'Avatar').attr('src', src);
            el.find('.jsxc_avatar').prepend(img);
         };

         if (avatarSrc !== null) {
            setAvatar(avatarSrc);
         } else {
            jsxc.xmpp.conn.vcard.get(function(stanza) {
               jsxc.debug('vCard', stanza);

               var vCard = $(stanza).find("vCard > PHOTO");
               var src;

               if (vCard.length === 0) {
                  jsxc.debug('No photo provided');
                  src = 0;
               } else {
                  var img = vCard.find('BINVAL').text();
                  var type = vCard.find('TYPE').text();
                  src = 'data:' + type + ';base64,' + img;
               }

               jsxc.storage.setUserItem('avatar_' + aid, src);
               setAvatar(src);
            }, Strophe.getBareJidFromJid(jid), function(msg) {
               jsxc.warn('Could not load vcard.', msg);

               jsxc.storage.setUserItem('avatar_' + aid, 0);
               setAvatar(0);
            });
         }
      },

      /**
       * Returns the window element
       * 
       * @param {String} cid
       * @returns {jquery} jQuery object of the window element
       */
      getWindow: function(cid) {
         return $('#jsxc_window_' + cid);
      },

      /**
       * Toggle list with timeout, like menu or settings
       * 
       * @memberof jsxc.gui
       */
      toggleList: function() {
         $(this).disableSelection();

         var ul = $(this).find('ul');
         var slideUp = null;

         slideUp = function() {
            ul.slideUp();
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

         $('#jsxc_dialog').find('form').submit(function() {

            jsxc.gui.dialog.close();
            jsxc.gui.showWaitAlert(jsxc.l.please_wait_until_we_logged_you_in);

            $(this).find('input[type=submit]').prop('disabled', true);

            jsxc.options.xmpp.jid = $(this).find('#jsxc_username').val();
            jsxc.options.xmpp.password = $(this).find('#jsxc_password').val();

            jsxc.triggeredFromBox = true;
            jsxc.options.loginForm.form = $(this);

            jsxc.xmpp.login();

            return false;
         });
      },

      /**
       * Creates and show the fingerprint dialog
       * 
       * @param {String} cid
       */
      showFingerprints: function(cid) {
         jsxc.gui.dialog.open(jsxc.gui.template.get('fingerprintsDialog', cid));
      },

      /**
       * Creates and show the verification dialog
       * 
       * @param {String} cid
       */
      showVerification: function(cid) {

         // Check if there is a open dialog
         if ($('#jsxc_dialog').length > 0) {
            setTimeout(function() {
               jsxc.gui.showVerification(cid);
            }, 3000);
            return;
         }

         // verification only possible if the connection is encrypted
         if (jsxc.storage.getUserItem('buddy_' + cid).msgstate !== OTR.CONST.MSGSTATE_ENCRYPTED) {
            jsxc.warn('Connection not encrypted');
            return;
         }

         jsxc.gui.dialog.open(jsxc.gui.template.get('authenticationDialog', cid));

         // Add handler

         $('#jsxc_dialog > div:gt(0)').hide();
         $('#jsxc_dialog select').change(function() {
            $('#jsxc_dialog > div:gt(0)').hide();
            $('#jsxc_dialog > div:eq(' + $(this).prop('selectedIndex') + ')').slideDown({
               complete: function() {
                  jsxc.gui.dialog.resize();
               }
            });
         });

         // Manual
         $('#jsxc_dialog > div:eq(1) a.creation').click(function() {
            if (jsxc.master) {
               jsxc.buddyList[cid].trust = true;
            }

            jsxc.storage.updateUserItem('buddy_' + cid, 'trust', true);

            jsxc.gui.dialog.close();

            jsxc.storage.updateUserItem('buddy_' + cid, 'trust', true);
            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.conversation_is_now_verified);
            jsxc.gui.update(cid);
         });

         // Question
         $('#jsxc_dialog > div:eq(2) a.creation').click(function() {
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
               jsxc.otr.sendSmpReq(cid, sec, quest);
            } else {
               jsxc.storage.setUserItem('smp_' + cid, {
                  sec: sec,
                  quest: quest
               });
            }

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_query_sent);
         });

         // Secret
         $('#jsxc_dialog > div:eq(3) .creation').click(function() {
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
               jsxc.otr.sendSmpReq(cid, sec);
            } else {
               jsxc.storage.setUserItem('smp_' + cid, {
                  sec: sec,
                  quest: null
               });
            }

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_query_sent);
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

         $('#jsxc_dialog .jsxc_deny').click(function() {
            jsxc.xmpp.resFriendReq(from, false);

            jsxc.gui.dialog.close();
         });

         $('#jsxc_dialog .jsxc_approve').click(function() {
            var data = jsxc.storage.getUserItem('buddy_' + jsxc.jidToCid(from));

            jsxc.xmpp.resFriendReq(from, true);

            // If friendship is not mutual show contact dialog
            if (!data || data.sub === 'from') {
               $(document).one('close.dialog.jsxc', function() {
                  jsxc.gui.showContactDialog(from);
               });
            }

            jsxc.gui.dialog.close();
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

         $('#jsxc_dialog input').keypress(function(ev) {
            if (ev.which === 13) {
               $('#jsxc_dialog .creation').click();
            }
         });

         $('#jsxc_dialog form').submit(function() {
            var username = $('#jsxc_username').val();
            var alias = $('#jsxc_alias').val();

            if (!username.match(/@(.*)$/)) {
               username += '@' + Strophe.getDomainFromJid(jsxc.storage.getItem('jid'));
            }

            // Check if the username is valid
            if (!username || !username.match(/^[\w-_.]+@[\w-_.]+$/g)) {
               // Add notification
               $('#jsxc_username').addClass('jsxc_invalid').keyup(function() {
                  if ($(this).val().match(/^[\w-_.]+@[\w-_.]+$/g)) {
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
       * @param {type} cid
       * @returns {undefined}
       */
      showRemoveDialog: function(cid) {

         jsxc.gui.dialog.open(jsxc.gui.template.get('removeDialog', cid));

         var data = jsxc.storage.getUserItem('buddy_' + cid);

         $('#jsxc_dialog .creation').click(function() {
            if (jsxc.master) {
               jsxc.xmpp.removeBuddy(data.jid);
            } else {
               // inform master
               jsxc.storage.setUserItem('deletebuddy_' + cid, {
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

         $('#jsxc_dialog .creation').click(function() {
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
            $('#jsxc_dialog .creation').click(function() {
               confirm.call();
               jsxc.gui.dialog.open(jsxc.gui.template.get('pleaseAccept'), {
                  noClose: true
               });
            });
         }

         if (dismiss) {
            $('#jsxc_dialog .jsxc_cancel').click(dismiss);
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
       * @param {String} bjid Bar jid
       */
      showVcard: function(bjid) {
         jsxc.gui.dialog.open(jsxc.gui.template.get('vCard', jsxc.jidToCid(bjid)));

         var printProp = function(el, depth) {
            var content = '';

            el.each(function() {
               var item = $(this);
               var children = $(this).children();

               content += '<li>';

               var prop = jsxc.translate('%%' + item[0].tagName + '%%');

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
                  $('#jsxc_dialog ul.jsxc_vCard').append(content);
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
            content += jsxc.translate('%%Sorry, we couldn\'t load any vCard.%%');
            content += '</p>';

            $('#jsxc_dialog').append(content);
         };

         jsxc.xmpp.conn.vcard.get(function(stanza) {

            if ($('#jsxc_dialog ul.jsxc_vCard').length === 0) {
               return;
            }

            if ($(stanza).find('vCard').length === 0) {
               failedToLoad();
               return;
            }

            $('#jsxc_dialog p').remove();

            var photo = $(stanza).find("vCard > PHOTO");

            if (photo.length > 0) {
               var img = photo.find('BINVAL').text();
               var type = photo.find('TYPE').text();
               var src = 'data:' + type + ';base64,' + img;

               $('#jsxc_dialog h3').prepend('<img class="jsxc_vCard" src="' + src + '" alt="avatar" />');
            }

            printProp($(stanza).find('vcard > *'), 0);

         }, bjid, failedToLoad);
      },

      showSettings: function() {
         jsxc.gui.dialog.open(jsxc.gui.template.get('settings'));

         $('#jsxc_dialog form').each(function() {
            var self = $(this);

            self.find('input[type!="submit"]').each(function() {
               var id = this.id.split("-");
               var prop = id[0];
               var key = id[1];

               var data = jsxc.options.get(prop);

               if (data && data[key]) {
                  $(this).val(data[key]);
               }
            });
         });

         $('#jsxc_dialog form').submit(function(e) {

            var self = $(this);
            var data = {};

            self.find('input[type!="submit"]').each(function() {
               var id = this.id.split("-");
               var prop = id[0];
               var key = id[1];
               var val = $(this).val();

               if (!data[prop]) {
                  data[prop] = {};
               }

               data[prop][key] = val;
            });

            $.each(data, function(key, val) {
               jsxc.options.set(key, val);
            });

            setTimeout(function() {
               self.find('input[type="submit"]').effect('highlight', {
                  color: 'green'
               }, 4000);
            }, 200);

            return false;
         });
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
       * @param cid CSS id of user.
       * @param {CONST.STATUS} pres New presence state.
       */
      updatePresence: function(cid, pres) {

         if (cid === 'own') {
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

         $('.jsxc_presence_' + cid).removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + pres);
      }
   };

   /**
    * Handle functions related to the gui of the roster
    * 
    * @namespace jsxc.gui.roster
    */
   jsxc.gui.roster = {

      /**
       * Init the roster skeleton
       * 
       * @memberOf jsxc.gui.roster
       * @returns {undefined}
       */
      init: function() {
         $(jsxc.options.rosterAppend + ':first').append($(jsxc.gui.template.get('roster')));

         if (jsxc.options.get('hideOffline')) {
            $('#jsxc_menu .jsxc_hideOffline').text(jsxc.translate('%%Show offline%%'));
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

            $(this).text(hideOffline ? jsxc.translate('%%Show offline%%') : jsxc.translate('%%Hide offline%%'));

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

            jsxc.gui.changePresence(self.data('pres'));
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

         if (jsxc.storage.getUserItem('roster') === 'hidden') {
            $('#jsxc_roster').css('right', '-200px');
            $('#jsxc_windowList > ul').css('paddingRight', '10px');
         }

         var pres = jsxc.storage.getUserItem('presence') || 'online';
         $('#jsxc_presence > span').text($('#jsxc_presence > ul .jsxc_' + pres).text());
         jsxc.gui.updatePresence('own', pres);

         $(document).on('cloaded.roster.jsxc', function() {
            jsxc.gui.updateAvatar($('#jsxc_avatar'), jsxc.storage.getItem('jid'), 'own');
         });

         jsxc.gui.tooltip('#jsxc_roster');

         jsxc.notice.load();

         $(document).trigger('ready.roster.jsxc');
      },

      /**
       * Create roster item and add it to the roster
       * 
       * @param {String} cid CSS compatible jid
       */
      add: function(cid) {
         var data = jsxc.storage.getUserItem('buddy_' + cid);
         var bud = jsxc.gui.buddyTemplate.clone().attr('id', cid).attr('data-type', data.type || 'chat');

         jsxc.gui.roster.insert(cid, bud);

         bud.click(function() {
            jsxc.gui.window.open(cid);
         });

         bud.find('.jsxc_chaticon').click(function() {
            jsxc.gui.window.open(cid);
         });

         bud.find('.jsxc_rename').click(function() {
            jsxc.gui.roster.rename(cid);
            return false;
         });

         bud.find('.jsxc_delete').click(function() {
            jsxc.gui.showRemoveDialog(cid);
            return false;
         });

         bud.find('.jsxc_avatar').click(function() {
            bud.trigger('extra.jsxc');

            bud.toggleClass('jsxc_expand');

            jsxc.gui.updateAvatar(bud, data.jid, data.avatar);
            return false;
         });

         bud.find('.jsxc_vcardicon').click(function() {
            jsxc.gui.showVcard(data.jid);
            return false;
         });

         jsxc.gui.update(cid);

         // update scrollbar
         $('#jsxc_buddylist').slimScroll({
            scrollTo: '0px'
         });

         $(document).trigger('add.roster.jsxc', [ cid, data, bud ]);
      },

      /**
       * Insert roster item. First order: online > away > offline. Second order:
       * alphabetical of the name
       * 
       * @param {type} cid
       * @param {jquery} li roster item which should be insert
       * @returns {undefined}
       */
      insert: function(cid, li) {

         var data = jsxc.storage.getUserItem('buddy_' + cid);
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
       * @param {type} cid
       * @returns {undefined}
       */
      reorder: function(cid) {
         jsxc.gui.roster.insert(cid, jsxc.gui.roster.remove(cid));
      },

      /**
       * Removes buddy from roster
       * 
       * @param {String} cid CSS compatible jid
       * @return {JQueryObject} Roster list element
       */
      remove: function(cid) {
         return $('#' + cid).detach();
      },

      /**
       * Removes buddy from roster and clean up
       * 
       * @param {String} cid CSS compatible jid
       */
      purge: function(cid) {
         if (jsxc.master) {
            jsxc.storage.removeUserItem('buddy_' + cid);
            jsxc.storage.removeUserItem('otr_' + cid);
            jsxc.storage.removeUserItem('otr_version_' + cid);
            jsxc.storage.removeUserItem('chat_' + cid);
            jsxc.storage.removeUserItem('window_' + cid);
            jsxc.storage.removeUserElement('buddylist', cid);
            jsxc.storage.removeUserElement('windowlist', cid);
         }

         jsxc.gui.window._close(cid);
         jsxc.gui.roster.remove(cid);
      },

      /**
       * Create input element for rename action
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      rename: function(cid) {
         var name = $('#' + cid + ' .jsxc_name');
         var options = $('#' + cid + ' .jsxc_options');
         var input = $('<input type="text" name="name"/>');

         options.hide();
         name = name.replaceWith(input);

         input.val(name.text());
         input.keypress(function(ev) {
            if (ev.which !== 13) {
               return;
            }

            options.show();
            input.replaceWith(name);
            jsxc.gui.roster._rename(cid, $(this).val());

            $('html').off('click');
         });

         // Disable html click event, if click on input
         input.click(function() {
            return false;
         });

         $('html').one('click', function() {
            options.show();
            input.replaceWith(name);
            jsxc.gui.roster._rename(cid, input.val());
         });
      },

      /**
       * Rename buddy
       * 
       * @param {type} cid
       * @param {type} newname new name of buddy
       * @returns {undefined}
       */
      _rename: function(cid, newname) {
         if (jsxc.master) {
            var d = jsxc.storage.getUserItem('buddy_' + cid);
            var iq = $iq({
               type: 'set'
            }).c('query', {
               xmlns: 'jabber:iq:roster'
            }).c('item', {
               jid: Strophe.getBareJidFromJid(d.jid),
               name: newname
            });
            jsxc.xmpp.conn.sendIQ(iq);
         }

         jsxc.storage.updateUserItem('buddy_' + cid, 'name', newname);
         jsxc.gui.update(cid);
      },

      /**
       * Toogle complete roster
       * 
       * @param {Integer} d Duration in ms
       */
      toggle: function(d) {
         var duration = d || 500;

         var roster = $('#jsxc_roster');
         var wl = $('#jsxc_windowList > ul');

         var roster_width = roster.innerWidth();
         var roster_right = parseFloat($('#jsxc_roster').css('right'));
         var state = (roster_right < 0) ? 'shown' : 'hidden';

         jsxc.storage.setUserItem('roster', state);

         roster.animate({
            right: ((roster_width + roster_right) * -1) + 'px'
         }, duration);
         wl.animate({
            paddingRight: (10 - roster_right) + 'px'
         }, duration);

         $(document).trigger('toggle.roster.jsxc', [ state, duration ]);
      },

      /**
       * Shows a text with link to a login box that no connection exists.
       */
      noConnection: function() {
         $('#jsxc_roster .slimScrollDiv').remove();
         $('#jsxc_roster > .jsxc_bottom').remove();

         $('#jsxc_roster').append($('<p>' + jsxc.l.no_connection + '</p>').append(' <a>' + jsxc.l.relogin + '</a>').click(function() {
            jsxc.gui.showLoginBox();
         }));
      },
      
      /**
       * Shows a text with link to add a new buddy.
       * 
       * @memberOf jsxc.gui.roster
       */
      empty: function() { console.trace(); 
         var text = $('<p>' + jsxc.l.Your_roster_is_empty_add_a + '</p>');
         var link = $('<a>' + jsxc.l.new_buddy + '</a>');

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

         // default options
         var options = {};
         options = {
            onComplete: function() {
               $('#jsxc_dialog .jsxc_close').click(jsxc.gui.dialog.close);

               // workaround for old colorbox version (used by firstrunwizard)
               if (options.closeButton === false) {
                  $('#cboxClose').hide();
               }

               $.colorbox.resize();

               $(document).trigger('complete.dialog.jsxc');
            },
            onClosed: function() {
               $(document).trigger('close.dialog.jsxc');
            },
            onCleanup: function() {
               $(document).trigger('cleanup.dialog.jsxc');
            },
            opacity: 0.5
         };

         if (opt.noClose) {
            options.overlayClose = false;
            options.escKey = false;
            options.closeButton = false;
            delete opt.noClose;
         }

         $.extend(options, opt);

         options.html = '<div id="jsxc_dialog">' + data + '</div>';

         $.colorbox(options);

         return $('#jsxc_dialog');
      },

      /**
       * Close current dialog.
       */
      close: function() {
         jsxc.debug('close dialog');
         $.colorbox.close();
      },

      /**
       * Resizes current dialog.
       */
      resize: function() {
         $.colorbox.resize();
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
       * @param {String} cid
       * @returns {jQuery} Window object
       */
      init: function(cid) {
         if (jsxc.el_exists('#jsxc_window_' + cid)) {
            return jsxc.gui.getWindow(cid);
         }

         var win = jsxc.gui.windowTemplate.clone().attr('id', 'jsxc_window_' + cid).hide().appendTo('#jsxc_windowList > ul').show('slow');
         var data = jsxc.storage.getUserItem('buddy_' + cid);

         // Attach jid to window
         win.data('jid', data.jid);

         // Add handler

         jsxc.gui.toggleList.call(win.find('.jsxc_settings'));

         win.find('.jsxc_verification').click(function() {
            jsxc.gui.showVerification(cid);
         });

         win.find('.jsxc_fingerprints').click(function() {
            jsxc.gui.showFingerprints(cid);
         });

         win.find('.jsxc_transfer').click(function() {
            jsxc.otr.toggleTransfer(cid);
         });

         win.find('.jsxc_bar').click(function() {
            jsxc.gui.window.toggle(cid);
         });

         win.find('.jsxc_close').click(function() {
            jsxc.gui.window.close(cid);
         });

         win.find('.jsxc_clear').click(function() {
            jsxc.gui.window.clear(cid);
         });

         win.find('.jsxc_tools').click(function() {
            return false;
         });

         win.find('.jsxc_textinput').keyup(function(ev) {
            var body = $(this).val();

            if (ev.which === 13) {
               body = '';
            }

            jsxc.storage.updateUserItem('window_' + cid, 'text', body);
         });

         win.find('.jsxc_textinput').keypress(function(ev) {
            if (ev.which !== 13 || !$(this).val()) {
               return;
            }

            jsxc.gui.window.postMessage(cid, 'out', $(this).val());

            $(this).val('');
         });

         win.find('.jsxc_textarea').slimScroll({
            height: '234px',
            distance: '3px'
         });

         win.find('.jsxc_fade').hide();

         win.find('.jsxc_name').disableSelection();

         if ($.inArray(cid, jsxc.storage.getUserItem('windowlist')) < 0) {

            // add window to windowlist
            var wl = jsxc.storage.getUserItem('windowlist');
            wl.push(cid);
            jsxc.storage.setUserItem('windowlist', wl);

            // init window element in storage
            jsxc.storage.setUserItem('window_' + cid, {
               minimize: true,
               text: '',
               unread: false
            });
         } else {

            if (jsxc.storage.getUserItem('window_' + cid).unread) {
               win.addClass('jsxc_unreadMsg');
            }
         }

         $.each(jsxc.gui.emotions, function(i, val) {
            var ins = val[0].split(' ')[0];
            var li = $('<li><img alt="' + ins + '" title="' + ins + '" src="' + jsxc.options.root + '/img/emotions/' + val[1] + '"/></li>');
            li.click(function() {
               win.find('input').val(win.find('input').val() + ins);
               win.find('input').focus();
            });
            win.find('.jsxc_emoticons ul').append(li);
         });

         jsxc.gui.toggleList.call(win.find('.jsxc_emoticons'));

         jsxc.gui.window.restoreChat(cid);

         jsxc.gui.update(cid);

         // create related otr object
         if (jsxc.master && !jsxc.buddyList[cid]) {
            jsxc.otr.create(cid);
         }

         $(document).trigger('init.window.jsxc', [ win ]);

         return win;
      },

      /**
       * Open a window, related to the cid. If the window doesn't exist, it will
       * be created.
       * 
       * @param {String} cid
       * @returns {jQuery} Window object
       */
      open: function(cid) {
         var win = jsxc.gui.window.init(cid);
         jsxc.gui.window.show(cid);
         jsxc.gui.window.highlight(cid);

         win.find('.jsxc_textinput').focus();

         return win;
      },

      /**
       * Close chatwindow and clean up
       * 
       * @param {String} cid CSS compatible jid
       */
      close: function(cid) {

         if (!jsxc.el_exists('#jsxc_window_' + cid)) {
            jsxc.warn('Want to close a window, that is not open.');
            return;
         }

         jsxc.storage.removeUserElement('windowlist', cid);
         jsxc.storage.removeUserItem('window_' + cid);

         jsxc.gui.window._close(cid);
      },

      /**
       * Close chatwindow
       * 
       * @param {String} cid
       */
      _close: function(cid) {
         $('#jsxc_window_' + cid).hide('slow', function() {
            $(this).remove();
         });
      },

      /**
       * Toggle between minimize and maximize of the text area
       * 
       * @param {String} cid CSS compatible jid
       */
      toggle: function(cid) {
         if (jsxc.gui.getWindow(cid).find('.jsxc_fade').is(':hidden')) {
            jsxc.gui.window.show(cid);
         } else {
            jsxc.gui.window.hide(cid);
         }
      },

      /**
       * Maximize text area and save
       * 
       * @param {String} cid
       */
      show: function(cid) {

         jsxc.storage.updateUserItem('window_' + cid, 'minimize', false);

         jsxc.gui.window._show(cid);
      },

      /**
       * Maximize text area
       * 
       * @param {String} cid
       * @returns {undefined}
       */
      _show: function(cid) {
         var win = jsxc.gui.getWindow(cid);
         $('#jsxc_window_' + cid + ' .jsxc_fade').slideDown();
         win.removeClass('jsxc_min');

         // remove unread flag
         win.removeClass('jsxc_unreadMsg');
         jsxc.storage.updateUserItem('window_' + cid, 'unread', false);

         // If the area is hidden, the scrolldown function doesn't work. So we
         // call it here.
         jsxc.gui.window.scrollDown(cid);

         win.find('.jsxc_textinput').focus();

         win.trigger('show.window.jsxc');
      },

      /**
       * Minimize text area and save
       * 
       * @param {String} cid
       */
      hide: function(cid) {
         jsxc.storage.updateUserItem('window_' + cid, 'minimize', true);

         jsxc.gui.window._hide(cid);
      },

      /**
       * Minimize text area
       * 
       * @param {String} cid
       */
      _hide: function(cid) {
         $('#jsxc_window_' + cid + ' .jsxc_fade').slideUp();
         $('#jsxc_window_' + cid).addClass('jsxc_min');

         jsxc.gui.getWindow(cid).trigger('hidden.window.jsxc');
      },

      /**
       * Highlight window
       * 
       * @param {type} cid
       */
      highlight: function(cid) {
         var el = $('#jsxc_window_' + cid + ' .jsxc_bar');

         if (!el.is(':animated')) {
            el.effect('highlight', {
               color: 'orange'
            }, 2000);
         }
      },

      /**
       * Scroll chat area to the bottom
       * 
       * @param {String} cid CSS compatible jid
       */
      scrollDown: function(cid) {
         var chat = $('#jsxc_window_' + cid + ' .jsxc_textarea');

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
       * @param {String} cid CSS compatible jid
       * @param {String} direction 'in' message is received or 'out' message is
       *        send
       * @param {String} msg Message to display
       */
      postMessage: function(cid, direction, msg) {
         var chat = jsxc.storage.getUserItem('chat_' + cid) || [];
         var data = jsxc.storage.getUserItem('buddy_' + cid);
         var html_msg = msg;
         var uid = new Date().getTime() + ':msg';

         if (chat.length > jsxc.options.numberOfMsg) {
            chat.pop();
         }

         // escape html
         msg = jsxc.escapeHTML(msg);

         // exceptions:

         if (direction === 'out' && data.msgstate === 2) {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_please_end_your_private_conversation;
         }

         if (direction === 'in' && data.msgstate === 2) {
            direction = 'sys';
            msg = jsxc.l.unencrypted_message_received + ' ' + msg;
         }

         if (direction === 'out' && data.sub === 'from') {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_because_you_have_no_valid_subscription;
         }

         var post = {
            direction: direction,
            msg: msg,
            uid: uid.replace(/:/, '-'),
            received: false
         };

         chat.unshift(post);
         jsxc.storage.setUserItem('chat_' + cid, chat);

         if (direction === 'in') {
            $(document).trigger('postmessagein.jsxc', [ jsxc.jids[cid], html_msg ]);
         }

         if (direction === 'out' && jsxc.master) {
            jsxc.buddyList[cid].sendMsg(html_msg, uid);
         }

         jsxc.gui.window._postMessage(cid, post);

         if (direction === 'out' && msg === '?') {
            jsxc.gui.window.postMessage(cid, 'sys', '42');
         }
      },

      /**
       * Write Message to chat area
       * 
       * @param {String} cid CSS compatible jid
       * @param {Object} post Post object with direction, msg, uid, received
       * @param {Bool} restore If true no highlights are used and so unread flag
       *        set
       */
      _postMessage: function(cid, post, restore) {
         var win = jsxc.gui.getWindow(cid);
         var msg = post.msg;
         var direction = post.direction;
         var uid = post.uid;
         var received = post.received || false;

         if (win.find('.jsxc_textinput').is(':not(:focus)') && jsxc.restoreCompleted && direction === 'in' && !restore) {
            jsxc.gui.window.highlight(cid);
         }

         var reg = new RegExp(/((?:https?:\/\/|www\.|([\w\-]+\.[a-zA-Z]{2,3})(?=\b))(?:(?:[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*\([\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*\)([\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|])?)|(?:[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|]))?)/gi);

         msg = msg.replace(reg, function(url) {

            var href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

            return '<a href="' + href + '" target="_blank">' + url + '</a>';
         });

         $.each(jsxc.gui.emotions, function(i, val) {
            msg = msg.replace(val[2], function(match, p1) {

               // escape value for alt and title, this prevents double
               // replacement
               var esc = '', i;
               for (i = 0; i < p1.length; i++) {
                  esc += '&#' + p1.charCodeAt(i) + ';';
               }

               return '<img alt="' + esc + '" title="' + esc + '" src="' + jsxc.options.root + '/img/emotions/' + val[1] + '"/>';
            });
         });

         var msgDiv = $("<div>");
         msgDiv.addClass('jsxc_chatmessage jsxc_' + direction);
         msgDiv.attr('id', uid);
         msgDiv.html(msg);

         if (received) {
            msgDiv.addClass('jsxc_received');
         }

         if (direction === 'sys') {
            $('#jsxc_window_' + cid + ' .jsxc_textarea').append('<div style="clear:both"/>');
         }

         $('#jsxc_window_' + cid + ' .jsxc_textarea').append(msgDiv);

         jsxc.gui.window.scrollDown(cid);

         // if window is hidden set unread flag
         if (win.find('.jsxc_fade').is(':hidden') && jsxc.restoreCompleted && !restore) {
            win.addClass('jsxc_unreadMsg');
            jsxc.storage.updateUserItem('window_' + cid, 'unread', true);
         }
      },

      /**
       * Set text into input area
       * 
       * @param {type} cid
       * @param {type} text
       * @returns {undefined}
       */
      setText: function(cid, text) {
         $('#jsxc_window_' + cid + ' .jsxc_textinput').val(text);
      },

      /**
       * Load old log into chat area
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      restoreChat: function(cid) {
         var chat = jsxc.storage.getUserItem('chat_' + cid);

         while (chat !== null && chat.length > 0) {
            var c = chat.pop();
            jsxc.gui.window._postMessage(cid, c, true);
         }
      },

      /**
       * Clear chat history
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      clear: function(cid) {
         jsxc.storage.setUserItem('chat_' + cid, []);
         $('#jsxc_window_' + cid + ' .jsxc_textarea').empty();
      }
   };

   /**
    * Hold all HTML templates.
    * 
    * @namespace jsxc.gui.template
    */
   jsxc.gui.template = {
      /**
       * Return requested template and replace all placeholder
       * 
       * @memberOf jsxc.gui.template;
       * @param {type} name template name
       * @param {type} cid
       * @param {type} msg
       * @returns {String} HTML Template
       */
      get: function(name, cid, msg) {

         // common placeholder
         var ph = {
            my_priv_fingerprint: jsxc.storage.getUserItem('priv_fingerprint') ? jsxc.storage.getUserItem('priv_fingerprint').replace(/(.{8})/g, '$1 ') : jsxc.l.no_available,
            my_jid: jsxc.storage.getItem('jid'),
            root: jsxc.options.root
         };

         // placeholder depending on cid
         if (cid) {
            var data = jsxc.storage.getUserItem('buddy_' + cid);

            $.extend(ph, {
               cid_priv_fingerprint: data.fingerprint ? data.fingerprint.replace(/(.{8})/g, '$1 ') : jsxc.l.no_available,
               cid_jid: Strophe.getBareJidFromJid(data.jid),
               cid_name: data.name
            });
         }

         // placeholder depending on msg
         if (msg) {
            $.extend(ph, {
               msg: msg
            });
         }

         var ret = jsxc.gui.template[name];

         if (typeof (ret) === 'string') {
            ret = jsxc.translate(ret);

            ret = ret.replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, function(s, key) {
               return ph[key] || s;
            });

            return ret;
         }

         jsxc.debug('Template not available: ' + name);
         return name;
      },
      authenticationDialog: '<h3>Verification</h3>\
            <p>%%Authenticating_a_buddy_helps_%%</p>\
            <div>\
              <p style="margin:0px;">%%How_do_you_want_to_authenticate_your_buddy%%</p>\
              <select size="1">\
                <option>%%Select_method%%</option>\
                <option>%%Manual%%</option>\
                <option>%%Question%%</option>\
                <option>%%Secret%%</option>\
              </select>\
            </div>\
            <div style="display:none">\
              <p class=".jsxc_explanation">%%To_verify_the_fingerprint_%%</p>\
              <p><strong>%%Your_fingerprint%%</strong><br />\
              <span style="text-transform:uppercase">{{my_priv_fingerprint}}</span></p>\
              <p><strong>%%Buddy_fingerprint%%</strong><br />\
              <span style="text-transform:uppercase">{{cid_priv_fingerprint}}</span></p><br />\
              <p class="jsxc_right"><a href="#" class="jsxc_close button">%%Close%%</a> <a href="#" class="button creation">%%Compared%%</a></p>\
            </div>\
            <div style="display:none">\
              <p class=".jsxc_explanation">%%To_authenticate_using_a_question_%%</p>\
              <p><label for="jsxc_quest">%%Question%%:</label><input type="text" name="quest" id="jsxc_quest" /></p>\
              <p><label for="jsxc_secret2">%%Secret%%:</label><input type="text" name="secret2" id="jsxc_secret2" /></p>\
              <p class="jsxc_right"><a href="#" class="button jsxc_close">%%Close%%</a> <a href="#" class="button creation">%%Ask%%</a></p>\
            </div>\
            <div style="display:none">\
              <p class=".jsxc_explanation">%%To_authenticate_pick_a_secret_%%</p>\
              <p><label for="jsxc_secret">%%Secret%%:</label><input type="text" name="secret" id="jsxc_secret" /></p>\
              <p class="jsxc_right"><a href="#" class="button jsxc_close">%%Close%%</a> <a href="#" class="button creation">%%Compare%%</a></p>\
            </div>',
      fingerprintsDialog: '<div>\
          <p class="jsxc_maxWidth">%%A_fingerprint_%%</p>\
          <p><strong>%%Your_fingerprint%%</strong><br />\
          <span style="text-transform:uppercase">{{my_priv_fingerprint}}</span></p>\
          <p><strong>%%Buddy_fingerprint%%</strong><br />\
          <span style="text-transform:uppercase">{{cid_priv_fingerprint}}</span></p><br />\
          <p class="jsxc_right"><a href="#" class="button jsxc_close">%%Close%%</a></p>\
        </div>',
      chatWindow: '<li class="jsxc_min">\
            <div class="jsxc_window">\
                <div class="jsxc_bar">\
                     <div class="jsxc_avatar">☺</div>\
                     <div class="jsxc_tools">\
                           <div class="jsxc_settings">\
                               <ul>\
                                   <li class="jsxc_fingerprints">%%Fingerprints%%</li>\
                                   <li class="jsxc_verification">%%Authentifikation%%</li>\
                                   <li class="jsxc_transfer">%%start_private%%</li>\
                                   <li class="jsxc_clear">%%clear_history%%</li>\
                               </ul>\
                           </div>\
                           <div class="jsxc_transfer"/>\
                           <div class="jsxc_close">×</div>\
                     </div>\
                     <div class="jsxc_name"/>\
                     <div class="jsxc_cycle"/>\
                </div>\
                <div class="jsxc_fade">\
                   <div class="jsxc_gradient"/>\
                   <div class="jsxc_textarea"/>\
                   <div class="jsxc_emoticons"><ul/></div>\
                   <input type="text" class="jsxc_textinput" placeholder="...%%Message%%" />\
                </div>\
            </div>\
        </li>',
      roster: '<div id="jsxc_roster">\
           <ul id="jsxc_buddylist"></ul>\
           <div class="jsxc_bottom jsxc_presence_own">\
              <div id="jsxc_avatar">\
                 <div class="jsxc_avatar">☺</div>\
              </div>\
              <div id="jsxc_menu">\
                 <span></span>\
                 <ul>\
                     <li class="jsxc_settings">%%Settings%%</li>\
                     <li class="jsxc_muteNotification">%%Mute%%</li>\
                     <li class="jsxc_addBuddy">%%Add_buddy%%</li>\
                     <li class="jsxc_hideOffline">%%Hide offline%%</li>\
                     <li class="jsxc_onlineHelp">%%Online help%%</li>\
                     <li class="jsxc_about">%%About%%</li>\
                 </ul>\
              </div>\
              <div id="jsxc_notice">\
                 <span></span>\
                 <ul></ul>\
              </div>\
              <div id="jsxc_presence">\
                 <span>%%Online%%</span>\
                 <ul>\
                     <li data-pres="online" class="jsxc_online">%%Online%%</li>\
                     <li data-pres="chat" class="jsxc_chat">%%Chatty%%</li>\
                     <li data-pres="away" class="jsxc_away">%%Away%%</li>\
                     <li data-pres="xa" class="jsxc_xa">%%Extended away%%</li>\
                     <li data-pres="dnd" class="jsxc_dnd">%%dnd%%</li>\
                     <!-- <li data-pres="offline" class="jsxc_offline">%%Offline%%</li> -->\
                 </ul>\
              </div>\
           </div>\
           <div id="jsxc_toggleRoster"></div>\
       </div>',
      windowList: '<div id="jsxc_windowList">\
            <ul></ul>\
        </div>',
      rosterBuddy: '<li>\
            <div class="jsxc_avatar">☺</div>\
            <div class="jsxc_name"/>\
            <div class="jsxc_options jsxc_right">\
                <div class="jsxc_rename" title="%%rename_buddy%%">✎</div>\
                <div class="jsxc_delete" title="%%delete_buddy%%">✘</div>\
            </div>\
            <div class="jsxc_options jsxc_left">\
                <div class="jsxc_chaticon" title="%%send_message%%"/>\
                <div class="jsxc_vcardicon" title="%%get_info%%">i</div>\
            </div>\
        </li>',
      loginBox: '<h3>%%Login%%</h3>\
        <form method="get">\
            <p><label for="jsxc_username">%%Username%%:</label>\
               <input type="text" name="username" id="jsxc_username" required="required" value="{{my_jid}}"/></p>\
            <p><label for="jsxc_password">%%Password%%:</label>\
               <input type="password" name="password" required="required" id="jsxc_password" /></p>\
            <div class="bottom_submit_section">\
                <input type="reset" class="button jsxc_close" name="clear" value="%%Cancel%%"/>\
                <input type="submit" class="button creation" name="commit" value="%%Connect%%"/>\
            </div>\
        </form>',
      contactDialog: '<h3>%%Add_buddy%%</h3>\
         <p class=".jsxc_explanation">%%Type_in_the_full_username_%%</p>\
         <form>\
         <p><label for="jsxc_username">* %%Username%%:</label>\
            <input type="email" name="username" id="jsxc_username" required="required" /></p>\
         <p><label for="jsxc_alias">%%Alias%%:</label>\
            <input type="text" name="alias" id="jsxc_alias" /></p>\
         <p class="jsxc_right">\
            <input class="button" type="submit" value="%%Add%%" />\
         </p>\
         <form>',
      approveDialog: '<h3>%%Subscription_request%%</h3>\
        <p>%%You_have_a_request_from%% <b class="jsxc_their_jid"></b>.</p>\
        <p class="jsxc_right"><a href="#" class="button jsxc_deny">%%Deny%%</a> <a href="#" class="button creation jsxc_approve">%%Approve%%</a></p>',
      removeDialog: '<h3>%%Remove buddy%%</h3>\
        <p class="jsxc_maxWidth">%%You_are_about_to_remove_%%</p>\
        <p class="jsxc_right"><a href="#" class="button jsxc_cancel jsxc_close">%%Cancel%%</a> <a href="#" class="button creation">%%Remove%%</a></p>',
      waitAlert: '<h3>%%Please_wait%%</h3>\
        <p>{{msg}}</p>\
        <p class="jsxc_center"><img src="{{root}}/img/loading.gif" alt="wait" width="32px" height="32px" /></p>',
      alert: '<h3>%%Alert%%</h3>\
        <p>{{msg}}</p>\
        <p class="jsxc_right"><a href="#" class="button jsxc_close jsxc_cancel">%%Ok%%</a></p>',
      authFailDialog: '<h3>%%Login_failed%%</h3>\
        <p>%%Sorry_we_cant_authentikate_%%</p>\
        <p class="jsxc_right">\
            <a class="button jsxc_cancel">%%Continue%%</a>\
            <a class="button creation">%%Retry%%</a>\
        </p>',
      confirmDialog: '<p>{{msg}}</p>\
        <p class="jsxc_right">\
            <a class="button jsxc_cancel jsxc_close">%%Dismiss%%</a>\
            <a class="button creation">%%Confirm%%</a>\
        </p>',
      pleaseAccept: '<p>%%Please_accept_%%</p>',
      aboutDialog: '<h3>JavaScript XMPP Chat</h3>\
         <p><b>Version: </b>' + jsxc.version + '<br />\
         <a href="http://jsxc.org/" target="_blank">www.jsxc.org</a><br />\
         <br />\
         <i>Released under the MIT license</i><br />\
         <br />\
         Real-time chat app for OwnCloud. This app requires external<br /> XMPP server (openfire, ejabberd etc.).<br />\
         <br />\
         <b>Credential: </b> <a href="http://www.beepzoid.com/old-phones/" target="_blank">David English (Ringtone)</a>,\
         <a href="https://soundcloud.com/freefilmandgamemusic/ping-1?in=freefilmandgamemusic/sets/free-notification-sounds-and" target="_blank">CameronMusic (Ping)</a></p>\
         <p class="jsxc_right"><a class="button jsxc_debuglog" href="#">Show debug log</a></p>',
      vCard: '<h3>vCard %%from%% {{cid_name}}</h3>\
         <ul class="jsxc_vCard"></ul>\
         <p><img src="{{root}}/img/loading.gif" alt="wait" width="32px" height="32px" /> %%Please_wait%%...</p>',
      settings: '<h3>%%User_settings%%</h3>\
         <p></p>\
         <form>\
            <fieldset class="jsxc_fieldsetPriority">\
               <legend>%%Priority%%</legend>\
               <label for="priority-online">%%Online%%</label><input type="number" value="0" id="priority-online" min="-128" max="127" step="1" required="required"/>\
               <label for="priority-chat">%%Chatty%%</label><input type="number" value="0" id="priority-chat" min="-128" max="127" step="1" required="required"/>\
               <label for="priority-away">%%Away%%</label><input type="number" value="0" id="priority-away" min="-128" max="127" step="1" required="required"/>\
               <label for="priority-xa">%%Extended_away%%</label><input type="number" value="0" id="priority-xa" min="-128" max="127" step="1" required="required"/>\
               <label for="priority-dnd">%%dnd%%</label><input type="number" value="0" id="priority-dnd" min="-128" max="127" step="1" required="required"/>\
               <input type="submit" value="%%Save%%"/>\
            </fieldset>\
         </form>'
   };

   /**
    * Handle XMPP stuff.
    * 
    * @namespace jsxc.xmpp
    */
   jsxc.xmpp = {
      conn: null, // connection

      /**
       * Create new connection or attach to old
       * 
       * @memberOf jsxc.xmpp
       */
      login: function() {

         var sid = jsxc.storage.getItem('sid');
         var rid = jsxc.storage.getItem('rid');
         var jid = jsxc.storage.getItem('jid');
         var url = jsxc.options.xmpp.url || jsxc.storage.getItem('boshUrl');

         // Register eventlistener
         $(document).on('connected.jsxc', jsxc.xmpp.connected);
         $(document).on('attached.jsxc', jsxc.xmpp.attached);
         $(document).on('disconnected.jsxc', jsxc.xmpp.disconnected);
         $(document).on('ridChange', jsxc.xmpp.onRidChange);

         Strophe.addNamespace('RECEIPTS', 'urn:xmpp:receipts');

         // Create new connection (no login)
         jsxc.xmpp.conn = new Strophe.Connection(url);

         // Override default function to preserve unique id
         var stropheGetUniqueId = jsxc.xmpp.conn.getUniqueId;
         jsxc.xmpp.conn.getUniqueId = function(suffix) {
            var uid = stropheGetUniqueId.call(jsxc.xmpp.conn, suffix);
            jsxc.storage.setItem('_uniqueId', jsxc.xmpp.conn._uniqueId);

            return uid;
         };

         if (jsxc.storage.getItem('debug') === true) {
            jsxc.xmpp.conn.xmlInput = function(data) {
               console.log('<', data);
            };
            jsxc.xmpp.conn.xmlOutput = function(data) {
               console.log('>', data);
            };
         }

         // Strophe.log = function(level, msg) {
         // console.log(level + " " + msg);
         // };

         var callback = function(status, condition) {

            jsxc.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

            switch (status) {
               case Strophe.Status.CONNECTED:
                  jsxc.cid = jsxc.jidToCid(jsxc.xmpp.conn.jid.toLowerCase());
                  $(document).trigger('connected.jsxc');
                  break;
               case Strophe.Status.ATTACHED:
                  $(document).trigger('attached.jsxc');
                  break;
               case Strophe.Status.DISCONNECTED:
                  $(document).trigger('disconnected.jsxc');
                  break;
               case Strophe.Status.CONNFAIL:
                  jsxc.xmpp.onConnfail(condition);
                  break;
               case Strophe.Status.AUTHFAIL:
                  jsxc.gui.showAuthFail();
                  break;
            }
         };

         if (jsxc.restore && sid && rid) {
            jsxc.debug('Try to attach');
            jsxc.debug('SID: ' + sid);
            jsxc.xmpp.conn.attach(jid, sid, rid, callback);
         } else {
            jsxc.debug('New connection');

            jsxc.xmpp.conn.connect(jsxc.options.xmpp.jid, jsxc.options.xmpp.password, callback);
         }
      },

      /**
       * Logs user out of his xmpp session and does some clean up.
       * 
       * @returns {Boolean}
       */
      logout: function() {

         // instruct all tabs
         jsxc.storage.removeItem('sid');

         // clean up
         jsxc.storage.removeUserItem('buddylist');
         jsxc.storage.removeUserItem('windowlist');
         jsxc.storage.removeItem('_uniqueId');

         if (!jsxc.master) {
            $('#jsxc_roster').remove();
            $('#jsxc_windowlist').remove();
            return true;
         }

         if (jsxc.xmpp.conn === null) {
            return true;
         }

         // Hide dropdown menu
         $('body').click();

         jsxc.triggeredFromElement = true;

         jsxc.xmpp.conn.disconnect();

         // Trigger real logout in jsxc.xmpp.disconnected()
         return false;
      },

      /**
       * Triggered if connection is established
       * 
       * @private
       */
      connected: function() {

         jsxc.xmpp.conn.pause();

         // Save sid and jid
         jsxc.storage.setItem('sid', jsxc.xmpp.conn._proto.sid);
         jsxc.storage.setItem('jid', jsxc.xmpp.conn.jid.toLowerCase());

         jsxc.storage.setItem('lastActivity', (new Date()).getTime());

         // make shure roster will be reloaded
         jsxc.storage.removeUserItem('buddylist');

         jsxc.storage.removeUserItem('windowlist');
         jsxc.storage.removeUserItem('own');
         jsxc.storage.removeUserItem('avatar_own');

         // submit login form
         if (jsxc.triggeredFromForm) {
            // Trigger normal submit
            jsxc.submitLoginForm();
            return;
         }

         // reload page after login from login box
         if (jsxc.triggeredFromBox) {
            window.location.reload();
            return;
         }

         jsxc.xmpp.connectionReady();
      },

      /**
       * Triggered if connection is attached
       * 
       * @private
       */
      attached: function() {

         jsxc.xmpp.conn.addHandler(jsxc.xmpp.onRosterChanged, 'jabber:iq:roster', 'iq', 'set');
         jsxc.xmpp.conn.addHandler(jsxc.xmpp.onMessage, null, 'message', 'chat');
         jsxc.xmpp.conn.addHandler(jsxc.xmpp.onReceived, null, 'message');
         jsxc.xmpp.conn.addHandler(jsxc.xmpp.onPresence, null, 'presence');

         // Only load roaster if necessary
         if (!jsxc.restore || !jsxc.storage.getUserItem('buddylist')) {
            // in order to not overide existing presence information, we send
            // pres first after roster is ready
            $(document).one('cloaded.roster.jsxc', jsxc.xmpp.sendPres);

            $('#jsxc_roster > p:first').remove();
            
            var iq = $iq({
               type: 'get'
            }).c('query', {
               xmlns: 'jabber:iq:roster'
            });

            jsxc.xmpp.conn.sendIQ(iq, jsxc.xmpp.onRoster);
         } else {
            jsxc.xmpp.sendPres();
         }

         jsxc.xmpp.connectionReady();
      },

      /**
       * Triggered if the connection is ready
       */
      connectionReady: function() {

         // Load saved unique id
         jsxc.xmpp.conn._uniqueId = jsxc.storage.getItem('_uniqueId') || new Date().getTime();

         $(document).trigger('connectionReady.jsxc');
      },

      /**
       * Sends presence stanza to server.
       */
      sendPres: function() {
         // disco stuff
         if (jsxc.xmpp.conn.disco) {
            jsxc.xmpp.conn.disco.addIdentity('client', 'web', 'JSXC');
            jsxc.xmpp.conn.disco.addFeature(Strophe.NS.DISCO_INFO);
            jsxc.xmpp.conn.disco.addFeature(Strophe.NS.RECEIPTS);
         }

         // create presence stanza
         var pres = $pres();

         if (jsxc.xmpp.conn.caps) {
            // attach caps
            pres.c('c', jsxc.xmpp.conn.caps.generateCapsAttrs()).up();
         }

         var presState = jsxc.storage.getUserItem('presence') || 'online';
         if (presState !== 'online') {
            pres.c('show').t(presState).up();
         }

         var priority = jsxc.options.get('priority');
         if (priority && typeof priority[presState] !== 'undefined' && parseInt(priority[presState]) !== 0) {
            pres.c('priority').t(priority[presState]).up();
         }

         jsxc.debug('Send presence', pres.toString());
         jsxc.xmpp.conn.send(pres);
      },

      /**
       * Triggered if lost connection
       * 
       * @private
       */
      disconnected: function() {
         jsxc.debug('disconnected');

         jsxc.storage.removeItem('sid');
         jsxc.storage.removeItem('rid');
         jsxc.storage.removeItem('lastActivity');
         jsxc.storage.removeItem('hidden');
         jsxc.storage.removeUserItem('avatar_own');

         jsxc.xmpp.conn = null;

         $('#jsxc_windowList').remove();

         if (jsxc.triggeredFromElement) {
            $('#jsxc_roster').remove();

            if (jsxc.triggeredFromLogout) {
               window.location = jsxc.options.logoutElement.attr('href');
            }
         } else {
            jsxc.gui.roster.noConnection();
         }

         window.clearInterval(jsxc.keepalive);
      },

      /**
       * Triggered on connection fault
       * 
       * @param {String} condition information why we lost the connection
       * @private
       */
      onConnfail: function(condition) {
         jsxc.debug('XMPP connection failed: ' + condition);

         if (jsxc.triggeredFromForm) {
            jsxc.submitLoginForm();
         }
      },

      /**
       * Triggered on initial roster load
       * 
       * @param {dom} iq
       * @private
       */
      onRoster: function(iq) {
         /*
          * <iq from='' type='get' id=''> <query xmlns='jabber:iq:roster'> <item
          * jid='' name='' subscription='' /> ... </query> </iq>
          */

         jsxc.debug('Load roster', iq);

         var buddies = [];

         $(iq).find('item').each(function() {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var cid = jsxc.jidToCid(jid);
            var sub = $(this).attr('subscription');

            buddies.push(cid);

            if (jsxc.storage.getUserItem('buddy_' + cid)) {
               jsxc.storage.updateUserItem('buddy_' + cid, {
                  jid: jid,
                  name: name,
                  status: 0,
                  sub: sub,
                  res: []
               });
               jsxc.storage.removeUserItem('res_' + cid);
            } else {
               jsxc.storage.setUserItem('buddy_' + cid, {
                  'jid': jid,
                  'name': name,
                  'status': 0,
                  sub: sub,
                  'msgstate': 0,
                  'transferReq': -1,
                  'trust': false,
                  'fingerprint': null,
                  res: []
               });
            }

            jsxc.gui.roster.add(cid);
         });

         if(buddies.length === 0) {
            jsxc.gui.roster.empty();
         }
         
         jsxc.storage.setUserItem('buddylist', buddies);

         jsxc.debug('Roster loaded');
         $(document).trigger('cloaded.roster.jsxc');
      },

      /**
       * Triggerd on roster changes
       * 
       * @param {dom} iq
       * @returns {Boolean} True to preserve handler
       * @private
       */
      onRosterChanged: function(iq) {
         /*
          * <iq from='' type='set' id=''> <query xmlns='jabber:iq:roster'> <item
          * jid='' name='' subscription='' /> </query> </iq>
          */

         jsxc.debug('onRosterChanged', iq);

         $(iq).find('item').each(function() {
            var jid = $(this).attr('jid');
            var name = $(this).attr('name') || jid;
            var cid = jsxc.jidToCid(jid);
            var sub = $(this).attr('subscription');
            // var ask = $(this).attr('ask');

            var bl = jsxc.storage.getUserItem('buddylist');

            if (sub === 'remove') {
               jsxc.gui.roster.purge(cid);
            } else if (bl.indexOf(cid) >= 0) {
               jsxc.storage.updateUserItem('buddy_' + cid, {
                  jid: jid,
                  name: name,
                  sub: sub
               });
               jsxc.gui.update(cid);
               jsxc.gui.roster.reorder(cid);
            } else {
               bl.push(cid); // (INFO) push returns the new length
               jsxc.storage.setUserItem('buddylist', bl);
               jsxc.storage.setUserItem('buddy_' + cid, {
                  jid: jid,
                  name: name,
                  status: 0,
                  sub: sub,
                  msgstate: 0,
                  transferReq: -1,
                  trust: false,
                  fingerprint: null,
                  type: 'chat'
               });
               jsxc.gui.roster.add(cid);
            }

            // Remove pending friendship request from notice list
            if (sub === 'from' || sub === 'both') {
               var notices = jsxc.storage.getUserItem('notices');
               var noticeKey = null, notice;

               for (noticeKey in notices) {
                  notice = notices[noticeKey];

                  if (notice.fnName === 'gui.showApproveDialog' && notice.fnParams[0] === jid) {
                     jsxc.debug('Remove notice with key ' + noticeKey);

                     jsxc.notice.remove(noticeKey);
                  }
               }
            }
         });
         
         if (!jsxc.storage.getUserItem('buddylist') || jsxc.storage.getUserItem('buddylist').length === 0) {
            jsxc.gui.roster.empty();
         } else {
            $('#jsxc_roster > p:first').remove();
         }

         // preserve handler
         return true;
      },

      /**
       * Triggered on incoming presence stanzas
       * 
       * @param {dom} presence
       * @private
       */
      onPresence: function(presence) {
         /*
          * <presence xmlns='jabber:client' type='unavailable' from='' to=''/>
          * 
          * <presence xmlns='jabber:client' from='' to=''> <priority>5</priority>
          * <c xmlns='http://jabber.org/protocol/caps'
          * node='http://psi-im.org/caps' ver='caps-b75d8d2b25' ext='ca cs
          * ep-notify-2 html'/> </presence>
          * 
          * <presence xmlns='jabber:client' from='' to=''> <show>chat</show>
          * <status></status> <priority>5</priority> <c
          * xmlns='http://jabber.org/protocol/caps'
          * node='http://psi-im.org/caps' ver='caps-b75d8d2b25' ext='ca cs
          * ep-notify-2 html'/> </presence>
          */
         jsxc.debug('onPresence', presence);

         var ptype = $(presence).attr('type');
         var from = $(presence).attr('from');
         var jid = Strophe.getBareJidFromJid(from).toLowerCase();
         var to = $(presence).attr('to');
         to = (to) ? Strophe.getBareJidFromJid(to).toLowerCase() : jid;
         var r = Strophe.getResourceFromJid(from);
         var cid = jsxc.jidToCid(jid);
         var data = jsxc.storage.getUserItem('buddy_' + cid);
         var res = jsxc.storage.getUserItem('res_' + cid) || {};
         var status = null;
         var xVCard = $(presence).find('x[xmlns="vcard-temp:x:update"]');

         if (jid === to) {
            return true;
         }

         if (ptype === 'error') {
            jsxc.error('[XMPP] ' + $(presence).attr('code'));
            return true;
         }

         // incoming friendship request
         if (ptype === 'subscribe') {
            jsxc.storage.setUserItem('friendReq', {
               jid: jid,
               approve: -1
            });
            jsxc.notice.add('%%Friendship request%%', '%%from%% ' + jid, 'gui.showApproveDialog', [ jid ]);

            return true;
         } else if (ptype === 'unavailable' || ptype === 'unsubscribed') {
            status = jsxc.CONST.STATUS.indexOf('offline');
         } else {
            var show = $(presence).find('show').text();
            if (show === '') {
               status = jsxc.CONST.STATUS.indexOf('online');
            } else {
               status = jsxc.CONST.STATUS.indexOf(show);
            }
         }

         if (status === 0) {
            delete res[r];
         } else {
            res[r] = status;
         }

         var maxVal = [];
         var max = 0, prop = null;
         for (prop in res) {
            if (res.hasOwnProperty(prop)) {
               if (max <= res[prop]) {
                  if (max !== res[prop]) {
                     maxVal = [];
                     max = res[prop];
                  }
                  maxVal.push(prop);
               }
            }
         }

         data.status = max;
         data.res = maxVal;
         data.jid = jid;

         // Looking for avatar
         if (xVCard.length > 0) {
            var photo = xVCard.find('photo');

            if (photo.length > 0 && photo.text() !== data.avatar) {
               jsxc.storage.removeUserItem('avatar_' + data.avatar);
               data.avatar = photo.text();
            }
         }

         // Reset jid
         if (jsxc.el_exists('#jsxc_window_' + cid)) {
            jsxc.gui.getWindow(cid).data('jid', jid);
         }

         jsxc.storage.setUserItem('buddy_' + cid, data);
         jsxc.storage.setUserItem('res_' + cid, res);

         jsxc.debug('Presence (' + from + '): ' + status);

         jsxc.gui.update(cid);
         jsxc.gui.roster.reorder(cid);

         $(document).trigger('presence.jsxc', [ from, status, presence ]);

         // preserve handler
         return true;
      },

      /**
       * Triggered on incoming message stanzas
       * 
       * @param {dom} presence
       * @returns {Boolean}
       * @private
       */
      onMessage: function(message) {
         /*
          * <message xmlns='jabber:client' type='chat' to='' id='' from=''>
          * <body>...</body> <active
          * xmlns='http://jabber.org/protocol/chatstates'/> </message>
          */

         jsxc.debug('Incoming message', message);

         var type = $(message).attr('type');
         var from = $(message).attr('from');
         var mid = $(message).attr('id');
         var jid = Strophe.getBareJidFromJid(from);
         var cid = jsxc.jidToCid(jid);
         var data = jsxc.storage.getUserItem('buddy_' + cid);
         var body = $(message).find('body:first').text();
         var request = $(message).find("request[xmlns='urn:xmpp:receipts']");
         var own = jsxc.storage.getUserItem('own') || [];

         if (!body || own.indexOf(from) >= 0) {
            return true;
         }

         $(document).trigger('message.jsxc', [ from, body ]);

         var win = jsxc.gui.window.init(cid);

         // If we now the full jid, we use it
         if (type === 'chat') {
            win.data('jid', from);
            jsxc.storage.updateUserItem('buddy_' + cid, {
               jid: from
            });
         }

         // create related otr object
         if (jsxc.master && !jsxc.buddyList[cid]) {
            jsxc.otr.create(cid);
         }

         if (mid !== null && request.length && data !== null && (data.sub === 'both' || data.sub === 'from') && type === 'chat') {
            // Send received according to XEP-0184
            jsxc.xmpp.conn.send($msg({
               to: from
            }).c('received', {
               xmlns: 'urn:xmpp:receipts',
               id: mid
            }));
         }

         jsxc.buddyList[cid].receiveMsg(body);

         // preserve handler
         return true;
      },

      /**
       * Triggerd if the rid changed
       * 
       * @param {event} ev
       * @param {obejct} data
       * @private
       */
      onRidChange: function(ev, data) {
         jsxc.storage.setItem('rid', data.rid);
      },

      /**
       * response to friendship request
       * 
       * @param {string} from jid from original friendship req
       * @param {boolean} approve
       */
      resFriendReq: function(from, approve) {
         if (jsxc.master) {
            jsxc.xmpp.conn.send($pres({
               to: from,
               type: (approve) ? 'subscribed' : 'unsubscribed'
            }));

            jsxc.storage.removeUserItem('friendReq');
            jsxc.gui.dialog.close();

         } else {
            jsxc.storage.updateUserItem('friendReq', 'approve', approve);
         }
      },

      /**
       * Add buddy to my friends
       * 
       * @param {string} username jid
       * @param {string} alias
       */
      addBuddy: function(username, alias) {
         var cid = jsxc.jidToCid(username);

         if (jsxc.master) {
            // add buddy to roster (trigger onRosterChanged)
            var iq = $iq({
               type: 'set'
            }).c('query', {
               xmlns: 'jabber:iq:roster'
            }).c('item', {
               jid: username,
               name: alias || ''
            });
            jsxc.xmpp.conn.sendIQ(iq);

            // send subscription request to buddy (trigger onRosterChanged)
            jsxc.xmpp.conn.send($pres({
               to: username,
               type: 'subscribe'
            }));

            jsxc.storage.removeUserItem('add_' + cid);
         } else {
            jsxc.storage.setUserItem('add_' + cid, {
               username: username,
               alias: alias || null
            });
         }
      },

      /**
       * Remove buddy from my friends
       * 
       * @param {type} jid
       */
      removeBuddy: function(jid) {
         var cid = jsxc.jidToCid(jid);

         // Shortcut to remove buddy from roster and cancle all subscriptions
         var iq = $iq({
            type: 'set'
         }).c('query', {
            xmlns: 'jabber:iq:roster'
         }).c('item', {
            jid: Strophe.getBareJidFromJid(jid),
            subscription: 'remove'
         });
         jsxc.xmpp.conn.sendIQ(iq);

         jsxc.gui.roster.purge(cid);
      },

      onReceived: function(message) {
         var from = $(message).attr('from');
         var jid = Strophe.getBareJidFromJid(from);
         var cid = jsxc.jidToCid(jid);
         var received = $(message).find("received[xmlns='urn:xmpp:receipts']");

         if (received.length) {
            var receivedId = received.attr('id').replace(/:/, '-');
            var chat = jsxc.storage.getUserItem('chat_' + cid);
            var i;

            for (i = chat.length - 1; i >= 0; i--) {
               if (chat[i].uid === receivedId) {
                  chat[i].received = true;

                  $('#' + receivedId).addClass('jsxc_received');

                  jsxc.storage.setUserItem('chat_' + cid, chat);
                  break;
               }
            }
         }

         return true;
      }
   };

   /**
    * Handle long-live data
    * 
    * @namespace jsxc.storage
    */
   jsxc.storage = {
      /**
       * Prefix for localstorage
       * 
       * @privat
       */
      prefix: 'jsxc.',

      /**
       * @param {type} uk Should we generate a user prefix?
       * @returns {String} prefix
       * @memberOf jsxc.storage
       */
      getPrefix: function(uk) {
         return jsxc.storage.prefix + ((uk && jsxc.cid) ? jsxc.cid + '.' : '');
      },

      /**
       * Save item to storage
       * 
       * @function
       * @param {String} key variablename
       * @param {Object} value value
       * @param {String} uk Userkey? Should we add the cid as prefix?
       */
      setItem: function(key, value, uk) {

         // Workaround for non-conform browser
         if (jsxc.storageNotConform > 0 && key !== 'rid' && key !== 'lastActivity') {
            if (jsxc.storageNotConform > 1 && jsxc.toSNC === null) {
               jsxc.toSNC = window.setTimeout(function() {
                  jsxc.storageNotConform = 0;
                  jsxc.storage.setItem('storageNotConform', 0);
               }, 1000);
            }

            jsxc.ls.push(JSON.stringify({
               key: key,
               value: value
            }));
         }

         if (typeof (value) === 'object') {
            value = JSON.stringify(value);
         }

         localStorage.setItem(jsxc.storage.getPrefix(uk) + key, value);
      },
      setUserItem: function(key, value) {
         return jsxc.storage.setItem(key, value, true);
      },

      /**
       * Load item from storage
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the cid as prefix?
       */
      getItem: function(key, uk) {
         key = jsxc.storage.getPrefix(uk) + key;

         var value = localStorage.getItem(key);
         try {
            return JSON.parse(value);
         } catch (e) {
            return value;
         }
      },

      /**
       * Get a user item from storage.
       * 
       * @param key
       * @returns
       */
      getUserItem: function(key) {
         return jsxc.storage.getItem(key, true);
      },

      /**
       * Remove item from storage
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the cid as prefix?
       */
      removeItem: function(key, uk) {

         // Workaround for non-conform browser
         if (jsxc.storageNotConform && key !== 'rid' && key !== 'lastActivity') {
            jsxc.ls.push(JSON.stringify({
               key: jsxc.storage.prefix + key,
               value: ''
            }));
         }

         localStorage.removeItem(jsxc.storage.getPrefix(uk) + key);
      },

      /**
       * Remove user item from storage.
       * 
       * @param key
       * @returns
       */
      removeUserItem: function(key) {
         return jsxc.storage.removeItem(key, true);
      },

      /**
       * Updates value of a variable in a saved object.
       * 
       * @function
       * @param {String} key variablename
       * @param {String|object} variable variablename in object or object with
       *        variable/key pairs
       * @param {Object} [value] value
       * @param {String} uk Userkey? Should we add the cid as prefix?
       */
      updateItem: function(key, variable, value, uk) {

         var data = jsxc.storage.getItem(key, uk) || {};

         if (typeof (variable) === 'object') {

            $.each(variable, function(key, val) {
               if (typeof (data[key]) === 'undefined') {
                  jsxc.debug('Variable ' + key + ' doesn\'t exist in ' + variable + '. It was created.');
               }

               data[key] = val;
            });
         } else {
            if (typeof (data[variable]) === 'undefined') {
               jsxc.debug('Variable ' + variable + ' doesn\'t exist. It was created.');
            }

            data[variable] = value;
         }

         jsxc.storage.setItem(key, data, uk);
      },

      /**
       * Updates value of a variable in a saved user object.
       * 
       * @param {String} key variablename
       * @param {String|object} variable variablename in object or object with
       *        variable/key pairs
       * @param {Object} [value] value
       */
      updateUserItem: function(key, variable, value) {
         return jsxc.storage.updateItem(key, variable, value, true);
      },

      /**
       * Inkrements value
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the cid as prefix?
       */
      ink: function(key, uk) {

         jsxc.storage.setItem(key, Number(jsxc.storage.getItem(key, uk)) + 1, uk);
      },

      /**
       * Remove element from array or object
       * 
       * @param {string} key name of array or object
       * @param {string} name name of element in array or object
       * @param {String} uk Userkey? Should we add the cid as prefix?
       * @returns {undefined}
       */
      removeElement: function(key, name, uk) {
         var item = jsxc.storage.getItem(key, uk);

         if ($.isArray(item)) {
            item = $.grep(item, function(e) {
               return e !== name;
            });
         } else if (typeof (item) === 'object') {
            delete item[name];
         }

         jsxc.storage.setItem(key, item, uk);
      },
      removeUserElement: function(key, name) {
         return jsxc.storage.removeElement(key, name, true);
      },

      /**
       * Triggered if changes are recognized
       * 
       * @function
       * @param {event} e Storageevent
       * @param {String} e.key Keyname which triggered event
       * @param {Object} e.oldValue Old Value for key
       * @param {Object} e.newValue New Value for key
       * @param {String} e.url
       */
      onStorage: function(e) {

         // skip
         if (e.key === jsxc.storage.prefix + 'rid' || e.key === jsxc.storage.prefix + 'lastActivity') {
            return;
         }

         var key = e.key.replace(/^jsxc\.(?:[\w\-]+-[\w\-]+\.)?(.*)/i, '$1');

         // Workaround for non-conform browser: Triggered event on every page
         // (own)
         if (jsxc.storageNotConform > 0 && jsxc.ls.length > 0) {

            var val = e.newValue;
            try {
               val = JSON.parse(val);
            } catch (err) {
            }

            var index = $.inArray(JSON.stringify({
               key: key,
               value: val
            }), jsxc.ls);

            if (index >= 0) {

               // confirm that the storage event is not fired regularly
               if (jsxc.storageNotConform > 1) {
                  window.clearTimeout(jsxc.toSNC);
                  jsxc.storageNotConform = 1;
                  jsxc.storage.setItem('storageNotConform', 1);
               }

               jsxc.ls.splice(index, 1);
               return;
            }
         }

         // Workaround for non-conform browser
         if (e.oldValue === e.newValue) {
            return;
         }

         var n, o;
         var cid = key.replace(/^[a-z]+_(.*)/i, '$1');

         // react if someone ask, if there is a master
         if (jsxc.master && key === 'alive') {
            jsxc.debug('Master request.');

            jsxc.storage.ink('alive');
            return;
         }

         // master alive
         if (!jsxc.master && (key === 'alive' || key === 'alive_busy') && !jsxc.triggeredFromElement) {

            // reset timeout
            window.clearTimeout(jsxc.to);
            jsxc.to = window.setTimeout(jsxc.checkMaster, ((key === 'alive') ? jsxc.options.timeout : jsxc.options.busyTimeout) + jsxc.random(60));

            // only call the first time
            if (!jsxc.role_allocation) {
               jsxc.onSlave();
            }

            return;
         }

         if (key.match(/^notices/)) {
            jsxc.notice.load();
         }

         if (key.match(/^presence/)) {
            jsxc.gui.changePresence(e.newValue, true);
         }

         if (key.match(/^options/) && e.newValue) {
            n = JSON.parse(e.newValue);

            if (typeof n.muteNotification !== 'undefined' && n.muteNotification) {
               jsxc.notification.muteSound(true);
            } else {
               jsxc.notification.unmuteSound(true);
            }
         }

         if (key.match(/^hidden/)) {
            if (jsxc.master) {
               clearTimeout(jsxc.toNotification);
            } else {
               jsxc.isHidden();
            }
         }

         if (key.match(/^chat_/)) {

            var posts = JSON.parse(e.newValue);
            var data, el;

            while (posts.length > 0) {
               data = posts.pop();
               el = $('#' + data.uid);

               if (el.length === 0) {
                  if (jsxc.master && data.direction === 'out') {
                     jsxc.buddyList[cid].sendMsg(data.msg, data.uid);
                  }

                  jsxc.gui.window._postMessage(cid, data);
               } else if (data.received) {
                  el.addClass('jsxc_received');
               }
            }
            return;
         }

         if (key.match(/^window_/)) {

            if (!e.newValue) {
               jsxc.gui.window._close(cid);
               return;
            }

            if (!e.oldValue) {
               jsxc.gui.window.open(cid);
               return;
            }

            n = JSON.parse(e.newValue);

            if (n.minimize) {
               jsxc.gui.window._hide(cid);
            } else {
               jsxc.gui.window._show(cid);
            }

            jsxc.gui.window.setText(cid, n.text);

            return;
         }

         if (key.match(/^smp_/)) {

            if (!e.newValue) {

               jsxc.gui.dialog.close();

               if (jsxc.master) {
                  jsxc.buddyList[cid].sm.abort();
               }

               return;
            }

            n = JSON.parse(e.newValue);

            if (typeof (n.data) !== 'undefined') {

               jsxc.otr.onSmpQuestion(cid, n.data);

            } else if (jsxc.master && n.sec) {
               jsxc.gui.dialog.close();

               jsxc.otr.sendSmpReq(cid, n.sec, n.quest);
            }
         }

         if (!jsxc.master && key.match(/^buddy_/)) {

            if (!e.newValue) {
               jsxc.gui.roster.purge(cid);
               return;
            }
            if (!e.oldValue) {
               jsxc.gui.roster.add(cid);
               return;
            }

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            jsxc.gui.update(cid);

            if (o.status !== n.status || o.sub !== n.sub) {
               jsxc.gui.roster.reorder(cid);
            }
         }

         if (jsxc.master && key.match(/^deletebuddy_/) && e.newValue) {
            n = JSON.parse(e.newValue);

            jsxc.xmpp.removeBuddy(n.jid);
            jsxc.storage.removeUserItem(key);
         }

         if (jsxc.master && key.match(/^buddy_/)) {

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            if (o.transferReq !== n.transferReq) {
               jsxc.storage.updateItem('buddy_' + cid, 'transferReq', -1);

               if (n.transferReq === 0) {
                  jsxc.otr.goPlain(cid);
               }
               if (n.transferReq === 1) {
                  jsxc.otr.goEncrypt(cid);
               }
            }

            if (o.name !== n.name) {
               jsxc.gui.roster._rename(cid, n.name);
            }
         }

         // logout
         if (key === 'sid') {
            if (!e.newValue) {
               // if (jsxc.master && jsxc.xmpp.conn) {
               // jsxc.xmpp.conn.disconnect();
               // jsxc.triggeredFromElement = true;
               // }
               jsxc.xmpp.logout();

            }
            return;
         }

         if (key === 'friendReq') {
            n = JSON.parse(e.newValue);

            if (jsxc.master && n.approve >= 0) {
               jsxc.xmpp.resFriendReq(n.jid, n.approve);
            }
         }

         if (jsxc.master && key.match(/^add_/)) {
            n = JSON.parse(e.newValue);

            jsxc.xmpp.addBuddy(n.username, n.alias);
         }

         if (e.key === 'jsxc_roster') {
            jsxc.gui.roster.toggle();
         }
      }
   };

   /**
    * @namespace jsxc.otr
    */
   jsxc.otr = {
      /**
       * Handler for otr receive event
       * 
       * @memberOf jsxc.otr
       * @param {string} cid
       * @param {string} msg received message
       * @param {string} encrypted True, if msg was encrypted.
       */
      receiveMessage: function(cid, msg, encrypted) {

         if (jsxc.buddyList[cid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT) {
            jsxc.otr.backup(cid);
         }

         if (jsxc.buddyList[cid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT && !encrypted) {
            jsxc.gui.window.postMessage(cid, 'sys', jsxc.translate('%%Received an unencrypted message.%% [') + msg + ']');
         } else {
            jsxc.gui.window.postMessage(cid, 'in', msg);
         }
      },

      /**
       * Handler for otr send event
       * 
       * @param {string} jid
       * @param {string} msg message to be send
       */
      sendMessage: function(jid, msg, uid) {
         if (jsxc.buddyList[jsxc.jidToCid(jid)].msgstate !== 0) {
            jsxc.otr.backup(jsxc.jidToCid(jid));
         }

         var data = jsxc.storage.getUserItem('buddy_' + jsxc.jidToCid(jid));
         var isBar = (Strophe.getBareJidFromJid(jid) === jid);
         var type = data.type || 'chat';
         var xmlMsg = $msg({
            to: jid,
            type: type,
            id: uid
         }).c('body').t(msg);

         if (type === 'chat' && (isBar || jsxc.xmpp.conn.caps.hasFeatureByJid(jid, Strophe.NS.RECEIPTS))) {
            // Add request according to XEP-0184
            xmlMsg.up().c('request', {
               xmlns: 'urn:xmpp:receipts'
            });
         }

         jsxc.xmpp.conn.send(xmlMsg);
      },

      /**
       * Create new otr instance
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      create: function(cid) {
         if (jsxc.buddyList.hasOwnProperty(cid)) {
            return;
         }

         jsxc.buddyList[cid] = new OTR(jsxc.options.otr);

         if (jsxc.options.otr.SEND_WHITESPACE_TAG) {
            jsxc.buddyList[cid].SEND_WHITESPACE_TAG = true;
         }

         if (jsxc.options.otr.WHITESPACE_START_AKE) {
            jsxc.buddyList[cid].WHITESPACE_START_AKE = true;
         }

         jsxc.buddyList[cid].on('status', function(status) {
            var data = jsxc.storage.getUserItem('buddy_' + cid);

            switch (status) {
               case OTR.CONST.STATUS_SEND_QUERY:
                  jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.trying_to_start_private_conversation);
                  break;
               case OTR.CONST.STATUS_AKE_SUCCESS:
                  data.fingerprint = jsxc.buddyList[cid].their_priv_pk.fingerprint();
                  data.msgstate = OTR.CONST.MSGSTATE_ENCRYPTED;

                  var msg = (jsxc.buddyList[cid].trust ? jsxc.l.Verified : jsxc.l.Unverified) + ' ' + jsxc.l.private_conversation_started;
                  jsxc.gui.window.postMessage(cid, 'sys', msg);
                  break;
               case OTR.CONST.STATUS_END_OTR:
                  data.fingerprint = null;

                  if (jsxc.buddyList[cid].msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
                     // we abort the private conversation

                     data.msgstate = OTR.CONST.MSGSTATE_PLAINTEXT;
                     jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.private_conversation_aborted);

                  } else {
                     // the buddy abort the private conversation

                     data.msgstate = OTR.CONST.MSGSTATE_FINISHED;
                     jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.your_buddy_closed_the_private_conversation_you_should_do_the_same);
                  }
                  break;
               case OTR.CONST.STATUS_SMP_HANDLE:
                  jsxc.keepBusyAlive();
                  break;
            }

            jsxc.storage.setUserItem('buddy_' + cid, data);

            // for encryption and verification state
            jsxc.gui.update(cid);
         });

         jsxc.buddyList[cid].on('smp', function(type, data) {
            switch (type) {
               case 'question': // verification request received
                  jsxc.otr.onSmpQuestion(cid, data);
                  jsxc.storage.setUserItem('smp_' + cid, {
                     data: data || null
                  });
                  break;
               case 'trust': // verification completed
                  jsxc.buddyList[cid].trust = data;
                  jsxc.storage.updateUserItem('buddy_' + cid, 'trust', data);
                  jsxc.otr.backup(cid);
                  jsxc.gui.update(cid);

                  if (data) {
                     jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.conversation_is_now_verified);
                  } else {
                     jsxc.gui.window.postMessage(cid, 'sys', jsxc.l.verification_fails);
                  }
                  jsxc.storage.removeUserItem('smp_' + cid);
                  jsxc.gui.dialog.close();
                  break;
               default:
                  jsxc.debug('[OTR] sm callback: Unknown type: ' + type);
            }
         });

         // Receive message
         jsxc.buddyList[cid].on('ui', function(msg, encrypted) {
            jsxc.otr.receiveMessage(cid, msg, encrypted === true);
         });

         // Send message
         jsxc.buddyList[cid].on('io', function(msg, uid) {
            jsxc.otr.sendMessage($('#jsxc_window_' + cid).data('jid'), msg, uid);
         });

         jsxc.buddyList[cid].on('error', function(err) {
            // Handle this case in jsxc.otr.receiveMessage
            if (err !== 'Received an unencrypted message.') {
               jsxc.gui.window.postMessage(cid, 'sys', '[OTR] ' + jsxc.translate('%%' + err + '%%'));
            }

            jsxc.error('[OTR] ' + err);
         });

         jsxc.otr.restore(cid);
      },

      /**
       * show verification dialog with related part (secret or question)
       * 
       * @param {type} cid
       * @param {string} [data]
       * @returns {undefined}
       */
      onSmpQuestion: function(cid, data) {
         jsxc.gui.showVerification(cid);

         $('#jsxc_dialog select').prop('selectedIndex', (data ? 2 : 3)).change();
         $('#jsxc_dialog > div:eq(0)').hide();

         if (data) {
            $('#jsxc_dialog > div:eq(2)').find('#jsxc_quest').val(data).prop('disabled', true);
            $('#jsxc_dialog > div:eq(2)').find('.creation').text('Answer');
            $('#jsxc_dialog > div:eq(2)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_answer_and_click_answer);
         } else {
            $('#jsxc_dialog > div:eq(3)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_secret);
         }

         $('#jsxc_dialog a[rel=close]').click(function() {
            jsxc.storage.removeUserItem('smp_' + cid);

            if (jsxc.master) {
               jsxc.buddyList[cid].sm.abort();
            }
         });
      },

      /**
       * Send verification request to buddy
       * 
       * @param {string} cid
       * @param {string} sec secret
       * @param {string} [quest] question
       * @returns {undefined}
       */
      sendSmpReq: function(cid, sec, quest) {
         jsxc.keepBusyAlive();

         jsxc.buddyList[cid].smpSecret(sec, quest);
      },

      /**
       * Toggle encryption state
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      toggleTransfer: function(cid) {
         if (jsxc.storage.getUserItem('buddy_' + cid).msgstate === 0) {
            jsxc.otr.goEncrypt(cid);
         } else {
            jsxc.otr.goPlain(cid);
         }
      },

      /**
       * Send request to encrypt the session
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      goEncrypt: function(cid) {
         if (jsxc.master) {
            jsxc.buddyList[cid].sendQueryMsg();
         } else {
            jsxc.storage.updateUserItem('buddy_' + cid, 'transferReq', 1);
         }
      },

      /**
       * Abort encryptet session
       * 
       * @param {type} cid
       * @returns {undefined}
       */
      goPlain: function(cid) {
         if (jsxc.master) {
            jsxc.buddyList[cid].endOtr.call(jsxc.buddyList[cid]);
            jsxc.buddyList[cid].init.call(jsxc.buddyList[cid]);

            jsxc.otr.backup(cid);
         } else {
            jsxc.storage.updateUserItem('buddy_' + cid, 'transferReq', 0);
         }
      },

      /**
       * Backups otr session
       * 
       * @param {string} cid
       */
      backup: function(cid) {
         var o = jsxc.buddyList[cid]; // otr object
         var r = {}; // return value

         if (o === null) {
            return;
         }

         // all variables which should be saved
         var savekey = [ 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval' ];

         var i;
         for (i = 0; i < savekey.length; i++) {
            r[savekey[i]] = JSON.stringify(o[savekey[i]]);
         }

         if (o.their_priv_pk !== null) {
            r.their_priv_pk = JSON.stringify(o.their_priv_pk.packPublic());
         }

         if (o.ake.otr_version && o.ake.otr_version !== '') {
            r.otr_version = JSON.stringify(o.ake.otr_version);
         }

         jsxc.storage.setUserItem('otr_' + cid, r);
      },

      /**
       * Restore old otr session
       * 
       * @param {string} cid
       */
      restore: function(cid) {
         var o = jsxc.buddyList[cid];
         var d = jsxc.storage.getUserItem('otr_' + cid);

         if (o === null || d === null) {
            return;
         }

         var key;
         for (key in d) {
            if (d.hasOwnProperty(key)) {
               var val = JSON.parse(d[key]);
               if (key === 'their_priv_pk' && val !== null) {
                  val = DSA.parsePublic(val);
               }
               if (key === 'otr_version' && val !== null) {
                  o.ake.otr_version = val;
               } else {
                  o[key] = val;
               }
            }
         }

         jsxc.buddyList[cid] = o;

         if (o.msgstate === 1 && o.their_priv_pk !== null) {
            o._smInit.call(jsxc.buddyList[cid]);
         }
      },

      /**
       * Create or load DSA key
       * 
       * @returns {unresolved}
       */
      createDSA: function() {
         if (jsxc.options.otr.priv) {
            return;
         }

         if (jsxc.storage.getUserItem('key') === null) {
            var msg = jsxc.l.now_we_will_create_your_private_key_;
            var worker = null;

            if (Worker) {
               // try to create web-worker

               try {
                  worker = new Worker(jsxc.options.root + '/lib/otr/build/dsa-webworker.js');
               } catch (err) {
                  jsxc.warn('Couldn\'t create web-worker.', err);
               }
            }

            if (worker !== null) {
               // create DSA key in background

               // add wait overlay on roster
               var waitDiv = $('<div>').addClass('jsxc_wait').html(jsxc.gui.template.get('waitAlert', null, msg));
               $('#jsxc_roster').append(waitDiv);

               worker.onmessage = function(e) {
                  var type = e.data.type;
                  var val = e.data.val;

                  if (type === 'debug') {
                     jsxc.debug(val);
                  } else if (type === 'data') {
                     jsxc.otr.DSAready(DSA.parsePrivate(val));
                  }
               };

               // start worker
               worker.postMessage({
                  imports: [ jsxc.options.root + '/lib/otr/vendor/salsa20.js', jsxc.options.root + '/lib/otr/vendor/bigint.js', jsxc.options.root + '/lib/otr/vendor/crypto.js', jsxc.options.root + '/lib/otr/vendor/eventemitter.js', jsxc.options.root + '/lib/otr/lib/const.js', jsxc.options.root + '/lib/otr/lib/helpers.js', jsxc.options.root + '/lib/otr/lib/dsa.js' ],
                  seed: BigInt.getSeed(),
                  debug: true
               });

            } else {
               // fallback

               jsxc.gui.dialog.open(jsxc.gui.template.get('waitAlert', null, msg), {
                  noClose: true
               });

               jsxc.debug('DSA key creation started.');

               // wait until the wait alert is opened
               setTimeout(function() {
                  var dsa = new DSA();
                  jsxc.otr.DSAready(dsa);
               }, 500);
            }
         } else {
            jsxc.debug('DSA key loaded');
            jsxc.options.otr.priv = DSA.parsePrivate(jsxc.storage.getUserItem('key'));

            jsxc.otr._createDSA();
         }
      },

      /**
       * Ending of createDSA().
       */
      _createDSA: function() {

         jsxc.storage.setUserItem('priv_fingerprint', jsxc.options.otr.priv.fingerprint());

         jsxc._onMaster();
      },

      /**
       * Ending of DSA key generation.
       * 
       * @param {DSA} dsa DSA object
       */
      DSAready: function(dsa) {
         // close wait alert
         jsxc.gui.dialog.close();
         $('#jsxc_roster .jsxc_wait').remove();

         jsxc.storage.setUserItem('key', dsa.packPrivate());
         jsxc.options.otr.priv = dsa;

         jsxc.otr._createDSA();
      }
   };

   /**
    * This namespace handles the Notification API.
    * 
    * @namespace jsxc.notification
    */
   jsxc.notification = {

      /** Current audio file. */
      audio: null,

      /**
       * Register notification on incoming messages.
       * 
       * @memberOf jsxc.notification
       */
      init: function() {
         $(document).on('postmessagein.jsxc', function(event, jid, msg) {
            msg = (msg.match(/^\?OTR/)) ? jsxc.translate('%%Encrypted message%%') : msg;
            var data = jsxc.storage.getUserItem('buddy_' + jsxc.jidToCid(jid));

            jsxc.notification.playSound(jsxc.CONST.SOUNDS.MSG);
            jsxc.notification.notify(jsxc.translate('%%New message from%% ') + data.name, msg);
         });

         $(document).on('callincoming.jingle', function() {
            jsxc.notification.playSound(jsxc.CONST.SOUNDS.CALL, true, true);
         });

         $(document).on('accept.call.jsxc reject.call.jsxc', function() {
            jsxc.notification.stopSound();
         });
      },

      /**
       * Shows a pop up notification.
       * 
       * @param title
       * @param msg
       * @param d
       */
      notify: function(title, msg, d, force) {
         if (!jsxc.options.notification || !jsxc.notification.hasPermission()) {
            return; // notifications disabled
         }

         if (!jsxc.isHidden() && !force) {
            return; // Tab is visible
         }

         jsxc.toNotification = setTimeout(function() {

            var popup = new Notification(jsxc.translate(title), {
               body: jsxc.translate(msg)
            });

            var duration = d || jsxc.options.popupDuration;

            if (duration > 0) {
               setTimeout(function() {
                  popup.close();
               }, duration);
            }
         }, 500);
      },

      /**
       * Checks if browser has support for notifications and add on chrome to
       * the default api.
       * 
       * @returns {Boolean} True if the browser has support.
       */
      hasSupport: function() {
         if (window.webkitNotifications) {
            // prepare chrome

            window.Notification = function(title, opt) {
               var popup = window.webkitNotifications.createNotification(null, title, opt.body);
               popup.show();

               popup.close = function() {
                  popup.cancel();
               };

               return popup;
            };

            var permission;
            switch (window.webkitNotifications.checkPermission()) {
               case 0:
                  permission = jsxc.CONST.NOTIFICATION_GRANTED;
                  break;
               case 2:
                  permission = jsxc.CONST.NOTIFICATION_DENIED;
                  break;
               default: // 1
                  permission = jsxc.CONST.NOTIFICATION_DEFAULT;
            }
            window.Notification.permission = permission;

            window.Notification.requestPermission = function(func) {
               window.webkitNotifications.requestPermission(func);
            };

            return true;
         } else if (window.Notification) {
            return true;
         } else {
            return false;
         }
      },

      /**
       * Ask user on first incoming message if we should inform him about new
       * messages.
       */
      prepareRequest: function() {

         $(document).one('postmessagein.jsxc', function() {
            jsxc.switchEvents({
               'notificationready.jsxc': function() {
                  jsxc.gui.dialog.close();
                  jsxc.notification.init();
                  jsxc.storage.setUserItem('notification', true);
               },
               'notificationfailure.jsxc': function() {
                  jsxc.gui.dialog.close();
                  jsxc.options.notification = false;
                  jsxc.storage.setUserItem('notification', false);
               }
            });

            setTimeout(function() {
               jsxc.gui.showConfirmDialog(jsxc.translate("%%Should we notify you_%%"), function() {
                  jsxc.notification.requestPermission();
               }, function() {
                  $(document).trigger('notificationfailure.jsxc');
               });
            }, 2000);
         });
      },

      /**
       * Request notification permission.
       */
      requestPermission: function() {
         window.Notification.requestPermission(function(status) {
            if (window.Notification.permission !== status) {
               window.Notification.permission = status;
            }

            if (jsxc.notification.hasPermission()) {
               $(document).trigger('notificationready.jsxc');
            } else {
               $(document).trigger('notificationfailure.jsxc');
            }
         });
      },

      /**
       * Check permission.
       * 
       * @returns {Boolean} True if we have the permission
       */
      hasPermission: function() {
         return window.Notification.permission === jsxc.CONST.NOTIFICATION_GRANTED;
      },

      /**
       * Plays the given file.
       * 
       * @memberOf jsxc.notification
       * @param {string} soundFile File relative to the sound directory
       * @param {boolean} loop True for loop
       * @param {boolean} force Play even if a tab is visible. Default: false.
       */
      playSound: function(soundFile, loop, force) {
         if (!jsxc.master) {
            // only master plays sound
            return;
         }

         if (jsxc.options.get('muteNotification') || jsxc.storage.getUserItem('presence') === 'dnd') {
            // sound mute or own presence is dnd
            return;
         }

         if (!jsxc.isHidden() && !force) {
            // tab is visible
            return;
         }

         // stop current audio file
         jsxc.notification.stopSound();

         var audio = new Audio(jsxc.options.root + '/sound/' + soundFile);
         audio.loop = loop || false;
         audio.play();

         jsxc.notification.audio = audio;
      },

      /**
       * Stop/remove current sound.
       * 
       * @memberOf jsxc.notification
       */
      stopSound: function() {
         var audio = jsxc.notification.audio;

         if (typeof audio !== 'undefined' && audio !== null) {
            audio.pause();
            jsxc.notification.audio = null;
         }
      },

      /**
       * Mute sound.
       * 
       * @memberOf jsxc.notification
       * @param {boolean} external True if triggered from external tab. Default:
       *        false.
       */
      muteSound: function(external) {
         $('#jsxc_menu .jsxc_muteNotification').text(jsxc.translate('%%Unmute%%'));

         if (external !== true) {
            jsxc.options.set('muteNotification', true);
         }
      },

      /**
       * Unmute sound.
       * 
       * @memberOf jsxc.notification
       * @param {boolean} external True if triggered from external tab. Default:
       *        false.
       */
      unmuteSound: function(external) {
         $('#jsxc_menu .jsxc_muteNotification').text(jsxc.translate('%%Mute%%'));

         if (external !== true) {
            jsxc.options.set('muteNotification', false);
         }
      }
   };

   /**
    * This namespace handle the notice system.
    * 
    * @namspace jsxc.notice
    * @memberOf jsxc
    */
   jsxc.notice = {
      /** Number of notices. */
      _num: 0,

      /**
       * Loads the saved notices.
       * 
       * @memberOf jsxc.notice
       */
      load: function() {
         // reset list
         $('#jsxc_notice ul li').remove();
         $('#jsxc_notice > span').text('');
         jsxc.notice._num = 0;

         var saved = jsxc.storage.getUserItem('notices') || [];
         var key = null;

         for (key in saved) {
            if (saved.hasOwnProperty(key)) {
               var val = saved[key];

               jsxc.notice.add(val.msg, val.description, val.fnName, val.fnParams, key);
            }
         }
      },

      /**
       * Add a new notice to the stack;
       * 
       * @memberOf jsxc.notice
       * @param msg Header message
       * @param description Notice description
       * @param fnName Function name to be called if you open the notice
       * @param fnParams Array of params for function
       * @param id Notice id
       */
      add: function(msg, description, fnName, fnParams, id) {
         var nid = id || Date.now();
         var list = $('#jsxc_notice ul');
         var notice = $('<li/>');

         notice.click(function() {
            jsxc.notice.remove(nid);

            var fnList = fnName.split('.');
            var fn = jsxc[fnList[0]];
            var i;
            for (i = 1; i < fnList.length; i++) {
               fn = fn[fnList[i]];
            }

            if (typeof fn === 'function') {
               fn.apply(null, fnParams);
            }

            return false;
         });

         notice.text(jsxc.translate(msg));
         notice.attr('title', jsxc.translate(description) || '');
         notice.attr('data-nid', nid);
         list.append(notice);

         $('#jsxc_notice > span').text(++jsxc.notice._num);

         if (!id) {
            var saved = jsxc.storage.getUserItem('notices') || {};
            saved[nid] = {
               msg: msg,
               description: description,
               fnName: fnName,
               fnParams: fnParams
            };
            jsxc.storage.setUserItem('notices', saved);

            jsxc.notification.notify(msg, description || '', null, true);
            jsxc.notification.playSound(jsxc.CONST.SOUNDS.NOTICE, false, true);
         }
      },

      /**
       * Removes notice from stack
       * 
       * @memberOf jsxc.notice
       * @param nid The notice id
       */
      remove: function(nid) {
         var el = $('#jsxc_notice li[data-nid=' + nid + ']');

         el.remove();
         $('#jsxc_notice > span').text(--jsxc.notice._num || '');

         var s = jsxc.storage.getUserItem('notices');
         delete s[nid];
         jsxc.storage.setUserItem('notices', s);
      }
   };

   /**
    * Contains all available translations
    * 
    * @namespace jsxc.l10n
    * @memberOf jsxc
    */
   jsxc.l10n = {
      en: {
         please_wait_until_we_logged_you_in: 'Please wait until we logged you in...',
         your_connection_is_unencrypted: 'Your connection is unencrypted.',
         your_connection_is_encrypted: 'Your connection is encrypted.',
         your_buddy_closed_the_private_connection: 'Your buddy closed the private connection.',
         start_private: 'Start private',
         close_private: 'Close private',
         your_buddy_is_verificated: 'Your buddy is verificated.',
         you_have_only_a_subscription_in_one_way: 'You have only a subscription in one way.',
         verification_query_sent: 'Verification query sent.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Your message wasn\'t send. Please end your private conversation.',
         unencrypted_message_received: 'Unencrypted message received:',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Your message was\'nt send, because you have no valid subscription.',
         no_available: 'No available',
         no_connection: 'No connection!',
         relogin: 'relogin',
         trying_to_start_private_conversation: 'Trying to start private conversation!',
         Verified: 'Verified',
         Unverified: 'Unverified',
         private_conversation_started: 'private conversation started.',
         private_conversation_aborted: 'Private conversation aborted!',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Your buddy closed the private conversation! You should do the same.',
         conversation_is_now_verified: 'Conversation is now verified.',
         verification_fails: 'Verification fails.',
         your_buddy_is_attempting_to_determine_: 'You buddy is attempting to determine if he or she is really talking to you.',
         to_authenticate_to_your_buddy: 'To authenticate to your buddy, ',
         enter_the_answer_and_click_answer: 'enter the answer and click Answer.',
         enter_the_secret: 'enter the secret.',
         now_we_will_create_your_private_key_: 'Now we will create your private key. This can take some time.',
         Authenticating_a_buddy_helps_: 'Authenticating a buddy helps ensure that the person you are talking to is who he or she is saying.',
         How_do_you_want_to_authenticate_your_buddy: 'How do you want to authenticate {{cid_name}} (<b>{{cid_jid}}</b>)?',
         Select_method: 'Select method...',
         Manual: 'Manual',
         Question: 'Question',
         Secret: 'Secret',
         To_verify_the_fingerprint_: 'To verify the fingerprint, contact your buddy via some other authenticated channel, such as the telephone.',
         Your_fingerprint: 'Your fingerprint',
         Buddy_fingerprint: 'Buddy fingerprint',
         Close: 'Close',
         Compared: 'Compared',
         To_authenticate_using_a_question_: 'To authenticate using a question, pick a question whose answer is known only you and your buddy.',
         Ask: 'Ask',
         To_authenticate_pick_a_secret_: 'To authenticate, pick a secret known only to you and your buddy.',
         Compare: 'Compare',
         Fingerprints: 'Fingerprints',
         Authentifikation: 'Authentifikation',
         Message: 'Message',
         Add_buddy: 'Add buddy',
         rename_buddy: 'rename buddy',
         delete_buddy: 'delete buddy',
         Login: 'Login',
         Username: 'Username',
         Password: 'Password',
         Cancel: 'Cancel',
         Connect: 'Connect',
         Type_in_the_full_username_: 'Type in the full username and optional an alias.',
         Alias: 'Alias',
         Add: 'Add',
         Subscription_request: 'Subscription request',
         You_have_a_request_from: 'You have a request from',
         Deny: 'Deny',
         Approve: 'Approve',
         Remove_buddy: 'Remove buddy',
         You_are_about_to_remove_: 'You are about to remove {{cid_name}} (<b>{{cid_jid}}</b>) from your buddy list. All related chats will be closed.',
         Continue: 'Continue',
         Please_wait: 'Please wait',
         Login_failed: 'Login failed',
         Sorry_we_cant_authentikate_: 'Sorry, we can\'t authentikate you at our chat server. Maybe the password is wrong?',
         Retry: 'Retry',
         clear_history: 'Clear history',
         New_message_from: 'New message from',
         Should_we_notify_you_: 'Should we notify you about new messages in the future?',
         Please_accept_: 'Please click the "Allow" button at the top.',
         Hide_offline: 'Hide offline',
         Show_offline: 'Show offline',
         About: 'About',
         dnd: 'Do Not Disturb',
         Mute: 'Mute',
         Unmute: 'Unmute',
         Subscription: 'Subscription',
         both: 'both',
         Status: 'Status',
         online: 'online',
         chat: 'chat',
         away: 'away',
         xa: 'extended away',
         offline: 'offline',
         none: 'none',
         Unknown_instance_tag: 'Unknown instance tag.',
         Not_of_our_latest_keys: 'Not of our latest key.',
         Received_an_unreadable_encrypted_message: 'Received an unreadable encrypted message.',
         Online: 'Online',
         Chatty: 'Chatty',
         Away: 'Away',
         Extended_away: 'Extended away',
         Offline: 'Offline',
         Friendship_request: 'Friendship request',
         Confirm: 'Confirm',
         Dismiss: 'Dismiss',
         Remove: 'Remove',
         Online_help: 'Online help',
         FN: 'Full Name',
         N: ' ',
         FAMILY: 'Family Name',
         GIVEN: 'Given Name',
         NICKNAME: 'Nickname',
         URL: 'URL',
         ADR: 'Address',
         STREET: 'Street Address',
         EXTADD: 'Extended Address',
         LOCALITY: 'Locality',
         REGION: 'Region',
         PCODE: 'Postal Code',
         CTRY: 'Country',
         TEL: 'Telephone',
         NUMBER: 'Number',
         EMAIL: 'Email',
         USERID: ' ',
         ORG: 'Organization',
         ORGNAME: 'Name',
         ORGUNIT: 'Unit',
         TITLE: 'Job Title',
         ROLE: 'Role',
         BDAY: 'Birthday',
         DESC: 'Description',
         PHOTO: ' ',
         send_message: 'send message',
         get_info: 'get info',
         Settings: 'Settings',
         Priority: 'Priority',
         Save: 'Save',
         User_settings: 'User settings',
         A_fingerprint_: 'A fingerprint is used to make sure that the person you are talking to is who he or she is saying.',
         Your_roster_is_empty_add_a: 'Your roster is empty, add a ',
         new_buddy: 'new buddy'
      },
      de: {
         please_wait_until_we_logged_you_in: 'Bitte warte bis wir dich eingeloggt haben.',
         your_connection_is_unencrypted: 'Deine Verbindung ist UNverschlüsselt.',
         your_connection_is_encrypted: 'Deine Verbindung ist verschlüsselt.',
         your_buddy_closed_the_private_connection: 'Dein Freund hat die private Verbindung getrennt.',
         start_private: 'Privat starten',
         close_private: 'Privat abbrechen',
         your_buddy_is_verificated: 'Dein Freund ist verifiziert.',
         you_have_only_a_subscription_in_one_way: 'Die Freundschaft ist nur einseitig.',
         verification_query_sent: 'Verifizierungsanfrage gesendet.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Deine Nachricht wurde nicht gesendet. Bitte beende die private Konversation.',
         unencrypted_message_received: 'Unverschlüsselte Nachricht erhalten.',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Deine Nachricht wurde nicht gesandt, da die Freundschaft einseitig ist.',
         no_available: 'Nicht verfügbar.',
         no_connection: 'Keine Verbindung.',
         relogin: 'Neu anmelden.',
         trying_to_start_private_conversation: 'Versuche private Konversation zu starten.',
         Verified: 'Verifiziert',
         Unverified: 'Unverifiziert',
         private_conversation_started: 'Private Konversation gestartet.',
         private_conversation_aborted: 'Private Konversation abgebrochen.',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Dein Freund hat die private Konversation beendet. Das solltest du auch tun!',
         conversation_is_now_verified: 'Konversation ist jetzt verifiziert',
         verification_fails: 'Verifizierung fehlgeschlagen.',
         your_buddy_is_attempting_to_determine_: 'Dein Freund versucht herauszufinden ob er wirklich mit dir redet.',
         to_authenticate_to_your_buddy: 'Um dich gegenüber deinem Freund zu verifizieren ',
         enter_the_answer_and_click_answer: 'gib die Antwort ein und klick auf Antworten.',
         enter_the_secret: 'gib das Geheimnis ein.',
         now_we_will_create_your_private_key_: 'Wir werden jetzt deinen privaten Schlüssel generieren. Das kann einige Zeit in Anspruch nehmen.',
         Authenticating_a_buddy_helps_: 'Einen Freund zu authentifizieren hilft sicher zustellen, dass die Person mit der du sprichst auch die ist die sie sagt.',
         How_do_you_want_to_authenticate_your_buddy: 'Wie willst du {{cid_name}} (<b>{{cid_jid}}</b>) authentifizieren?',
         Select_method: 'Wähle...',
         Manual: 'Manual',
         Question: 'Frage',
         Secret: 'Geheimnis',
         To_verify_the_fingerprint_: 'Um den Fingerprint zu verifizieren kontaktiere dein Freund über einen anderen Kommunikationsweg. Zum Beispiel per Telefonanruf.',
         Your_fingerprint: 'Dein Fingerprint',
         Buddy_fingerprint: 'Sein/Ihr Fingerprint',
         Close: 'Schließen',
         Compared: 'Verglichen',
         To_authenticate_using_a_question_: 'Um die Authentifizierung per Frage durchzuführen, wähle eine Frage bei welcher nur dein Freund die Antwort weiß.',
         Ask: 'Frage',
         To_authenticate_pick_a_secret_: 'Um deinen Freund zu authentifizieren, wähle ein Geheimnis welches nur deinem Freund und dir bekannt ist.',
         Compare: 'Vergleiche',
         Fingerprints: 'Fingerprints',
         Authentifikation: 'Authentifizierung',
         Message: 'Nachricht',
         Add_buddy: 'Freund hinzufügen',
         rename_buddy: 'Freund umbenennen',
         delete_buddy: 'Freund löschen',
         Login: 'Anmeldung',
         Username: 'Benutzername',
         Password: 'Passwort',
         Cancel: 'Abbrechen',
         Connect: 'Verbinden',
         Type_in_the_full_username_: 'Gib bitte den vollen Benutzernamen und optional ein Alias an.',
         Alias: 'Alias',
         Add: 'Hinzufügen',
         Subscription_request: 'Freundschaftsanfrage',
         You_have_a_request_from: 'Du hast eine Anfrage von',
         Deny: 'Ablehnen',
         Approve: 'Bestätigen',
         Remove_buddy: 'Freund entfernen',
         You_are_about_to_remove_: 'Du bist gerade dabei {{cid_name}} (<b>{{cid_jid}}</b>) von deiner Kontaktliste zu entfernen. Alle Chats werden geschlossen.',
         Continue: 'Weiter',
         Please_wait: 'Bitte warten',
         Login_failed: 'Anmeldung fehlgeschlagen',
         Sorry_we_cant_authentikate_: 'Wir können dich leider nicht anmelden. Vielleicht ist dein Passwort falsch?',
         Retry: 'Neuer Versuch',
         clear_history: 'Lösche Verlauf',
         New_message_from: 'Neue Nachricht von',
         Should_we_notify_you_: 'Sollen wir dich in Zukunft über eingehende Nachrichten informieren, auch wenn dieser Tab nicht im Vordergrund ist?',
         Please_accept_: 'Bitte klick auf den "Zulassen" Button oben.',
         Menu: 'Menü',
         Hide_offline: 'Offline ausblenden',
         Show_offline: 'Offline einblenden',
         About: 'Über',
         dnd: 'Beschäftigt',
         Mute: 'Ton aus',
         Unmute: 'Ton an',
         Subscription: 'Bezug',
         both: 'beidseitig',
         Status: 'Status',
         online: 'online',
         chat: 'chat',
         away: 'abwesend',
         xa: 'länger abwesend',
         offline: 'offline',
         none: 'keine',
         Unknown_instance_tag: 'Unbekannter instance tag.',
         Not_of_our_latest_keys: 'Nicht einer unserer letzten Schlüssel.',
         Received_an_unreadable_encrypted_message: 'Eine unlesbare verschlüsselte Nachricht erhalten.',
         Online: 'Online',
         Chatty: 'Gesprächig',
         Away: 'Abwesend',
         Extended_away: 'Länger abwesend',
         Offline: 'Offline',
         Friendship_request: 'Freundschaftsanfrage',
         Confirm: 'Bestätigen',
         Dismiss: 'Ablehnen',
         Remove: 'Löschen',
         Online_help: 'Online Hilfe',
         Settings: 'Einstellungen',
         Priority: 'Priorität',
         Save: 'Speichern',
         User_settings: 'Benutzereinstellungen',
         A_fingerprint_: 'Ein Fingerabdruck wird dazu benutzt deinen Gesprächspartner zu identifizieren.'
      },
      es: {
         please_wait_until_we_logged_you_in: 'Por favor, espere...',
         your_connection_is_unencrypted: 'Su conexión no está cifrada.',
         your_connection_is_encrypted: 'Su conexión está cifrada.',
         your_buddy_closed_the_private_connection: 'Su amigo ha cerrado la conexión privada.',
         start_private: 'Iniciar privado',
         close_private: 'Cerrar privado',
         your_buddy_is_verificated: 'Tu amigo está verificado.',
         you_have_only_a_subscription_in_one_way: 'Sólo tienes una suscripción de un modo.',
         verification_query_sent: 'Consulta de verificación enviada.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Su mensaje no fue enviado. Por favor, termine su conversación privada.',
         unencrypted_message_received: 'Mensaje no cifrado recibido:',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Su mensaje no se ha enviado, porque usted no tiene suscripción válida.',
         no_available: 'No disponible',
         no_connection: 'Sin conexión!',
         relogin: 'iniciar sesión nuevamente',
         trying_to_start_private_conversation: 'Intentando iniciar una conversación privada!',
         Verified: 'Verificado',
         Unverified: 'No verificado',
         private_conversation_started: 'se inició una conversación privada.',
         private_conversation_aborted: 'Conversación privada abortada!',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Su amigo cerró la conversación privada! Usted debería hacer lo mismo.',
         conversation_is_now_verified: 'La conversación es ahora verificada.',
         verification_fails: 'Fallo la verificación.',
         your_buddy_is_attempting_to_determine_: 'Tu amigo está tratando de determinar si él o ella está realmente hablando con usted.',
         to_authenticate_to_your_buddy: 'Para autenticar a su amigo, ',
         enter_the_answer_and_click_answer: 'introduce la respuesta y haga clic en Contestar.',
         enter_the_secret: 'especifique el secreto.',
         now_we_will_create_your_private_key_: 'Ahora vamos a crear su clave privada. Esto puede tomar algún tiempo.',
         Authenticating_a_buddy_helps_: 'Autenticación de un amigo ayuda a garantizar que la persona que está hablando es quien él o ella está diciendo.',
         How_do_you_want_to_authenticate_your_buddy: '¿Cómo desea autenticar {{cid_name}} (<b>{{cid_jid}}</b>)?',
         Select_method: 'Escoja un método...',
         Manual: 'Manual',
         Question: 'Pregunta',
         Secret: 'Secreto',
         To_verify_the_fingerprint_: 'Para verificar la firma digital, póngase en contacto con su amigo a través de algún otro canal autenticado, como el teléfono.',
         Your_fingerprint: 'Tu firma digital',
         Buddy_fingerprint: 'firma digital de tu amigo',
         Close: 'Cerrar',
         Compared: 'Comparado',
         To_authenticate_using_a_question_: 'Para autenticar mediante una pregunta, elegir una pregunta cuya respuesta se conoce sólo usted y su amigo.',
         Ask: 'Preguntar',
         To_authenticate_pick_a_secret_: 'Para autenticar, elija un secreto conocido sólo por usted y su amigo.',
         Compare: 'Comparar',
         Fingerprints: 'Firmas digitales',
         Authentifikation: 'Autenticación',
         Message: 'Mensaje',
         Add_buddy: 'Añadir amigo',
         rename_buddy: 'renombrar amigo',
         delete_buddy: 'eliminar amigo',
         Login: 'Iniciar Sesión',
         Username: 'Usuario',
         Password: 'Contraseña',
         Cancel: 'Cancelar',
         Connect: 'Conectar',
         Type_in_the_full_username_: 'Escriba el usuario completo y un alias opcional.',
         Alias: 'Alias',
         Add: 'Añadir',
         Subscription_request: 'Solicitud de suscripción',
         You_have_a_request_from: 'Tienes una petición de',
         Deny: 'Rechazar',
         Approve: 'Aprobar',
         Remove_buddy: 'Eliminar amigo',
         You_are_about_to_remove_: 'Vas a eliminar a {{cid_name}} (<b>{{cid_jid}}</b>) de tu lista de amigos. Todas las conversaciones relacionadas serán cerradas.',
         Continue: 'Continuar',
         Please_wait: 'Espere por favor',
         Login_failed: 'Fallo el inicio de sesión',
         Sorry_we_cant_authentikate_: 'Lo sentimos, no podemos autentificarlo en nuestro servidor de chat. ¿Tal vez la contraseña es incorrecta?',
         Retry: 'Reintentar',
         clear_history: 'Borrar el historial',
         New_message_from: 'Nuevo mensaje de',
         Should_we_notify_you_: '¿Debemos notificarle sobre nuevos mensajes en el futuro?',
         Please_accept_: 'Por favor, haga clic en el botón "Permitir" en la parte superior.',
         dnd: 'No Molestar',
         Mute: 'Desactivar sonido',
         Unmute: 'Activar sonido',
         Subscription: 'Suscripción',
         both: 'ambos',
         Status: 'Estado',
         online: 'en línea',
         chat: 'chat',
         away: 'ausente',
         xa: 'mas ausente',
         offline: 'desconectado',
         none: 'nadie',
         Unknown_instance_tag: 'Etiqueta de instancia desconocida.',
         Not_of_our_latest_keys: 'No de nuestra ultima tecla.',
         Received_an_unreadable_encrypted_message: 'Se recibió un mensaje cifrado ilegible.',
         Online: 'En linea',
         Chatty: 'Hablador',
         Away: 'Ausente',
         Extended_away: 'Mas ausente',
         Offline: 'Desconectado',
         Friendship_request: 'Solicitud de amistad',
         Confirm: 'Confirmar',
         Dismiss: 'Rechazar',
         Remove: 'Eliminar',
         Online_help: 'Ayuda en línea',
         Settings: 'Ajustes',
         Priority: 'Prioridad',
         Save: 'Guardar',
         User_settings: 'Configuración de usuario'
      }
   };
}(jQuery));
