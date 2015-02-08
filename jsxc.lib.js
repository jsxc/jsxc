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

      /** Timeout delay for notification */
      toNotificationDelay: 500,

      /** Interval for keep-alive */
      keepalive: null,

      /** True if last activity was 10 min ago */
      restore: false,

      /** True if restore is complete */
      restoreCompleted: false,

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

      /** My bar id */
      bid: null,

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
         },
         REGEX: {
            JID: new RegExp('\\b[^"&\'\\/:<>@\\s]+@[\\w-_.]+\\b', 'ig'),
            URL: new RegExp(/((?:https?:\/\/|www\.|([\w\-]+\.[a-zA-Z]{2,3})(?=\b))(?:(?:[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*\([\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*\)([\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|])?)|(?:[\-A-Za-z0-9+&@#\/%?=~_|!:,.;]*[\-A-Za-z0-9+&@#\/%=~_|]))?)/gi)
         },
         NS: {
            CARBONS: 'urn:xmpp:carbons:2',
            FORWARD: 'urn:xmpp:forward:0'
         }
      },

      /**
       * Parse a unix timestamp and return a formatted time string
       * 
       * @memberOf jsxc
       * @param {Object} unixtime
       * @returns time of day and/or date
       */
      getFormattedTime: function(unixtime) {
         var msgDate = new Date(parseInt(unixtime));
         var date = ('0' + msgDate.getDate()).slice(-2);
         var month = ('0' + (msgDate.getMonth() + 1)).slice(-2);
         var year = msgDate.getFullYear();
         var hours = ('0' + msgDate.getHours()).slice(-2);
         var minutes = ('0' + msgDate.getMinutes()).slice(-2);
         var dateNow = new Date(), time = hours + ':' + minutes;

         // compare dates only
         dateNow.setHours(0, 0, 0, 0);
         msgDate.setHours(0, 0, 0, 0);

         if (dateNow.getTime() !== msgDate.getTime()) {
            return date + '.' + month + '.' + year + ' ' + time;
         }
         return time;
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
            if (jsxc.storage.getItem('debug') === true) {
               console.log(msg, data);
            }

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
            $.extend(true, jsxc.options, options);
         }

         /**
          * Getter method for options. Saved options will override default one.
          * 
          * @param {string} key option key
          * @returns default or saved option value
          */
         jsxc.options.get = function(key) {
            var local = jsxc.storage.getUserItem('options') || {};

            return local[key] || jsxc.options[key];
         };

         /**
          * Setter method for options. Will write into localstorage.
          * 
          * @param {string} key option key
          * @param {object} value option value
          */
         jsxc.options.set = function(key, value) {
            jsxc.storage.updateItem('options', key, value, true);
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

         if (jsxc.storage.getItem('debug') === true) {
            jsxc.options.otr.debug = true;
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

               var settings = jsxc.prepareLogin();

               if (settings !== false && (settings.xmpp.onlogin === "true" || settings.xmpp.onlogin === true)) {
                  jsxc.options.loginForm.triggered = true;

                  jsxc.xmpp.login();

                  // Trigger submit in jsxc.xmpp.connected()
                  return false;
               }

               return true;
            });

         } else {

            // Restore old connection

            jsxc.bid = jsxc.jidToBid(jsxc.storage.getItem('jid'));

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
       * Load settings and prepare jid.
       * 
       * @memberOf jsxc
       * @returns Loaded settings
       */
      prepareLogin: function() {
         var username = $(jsxc.options.loginForm.jid).val();
         var password = $(jsxc.options.loginForm.pass).val();

         if (typeof jsxc.options.loadSettings !== 'function') {
            jsxc.error('No loadSettings function given. Abort.');
            return;
         }

         jsxc.gui.showWaitAlert(jsxc.l.Logging_in);

         var settings = jsxc.options.loadSettings.call(this, username, password);

         if (settings === false || settings === null || typeof settings === 'undefined') {
            jsxc.warn('No settings provided');

            return false;
         }

         if (typeof settings.xmpp.username === 'string') {
            username = settings.xmpp.username;
         }

         var resource = (settings.xmpp.resource) ? '/' + settings.xmpp.resource : '';
         var domain = settings.xmpp.domain;
         var jid;

         if (username.match(/@(.*)$/)) {
            jid = (username.match(/\/(.*)$/)) ? username : username + resource;
         } else {
            jid = username + '@' + domain + resource;
         }

         if (typeof jsxc.options.loginForm.preJid === 'function') {
            jid = jsxc.options.loginForm.preJid(jid);
         }

         jsxc.bid = jsxc.jidToBid(jid);

         settings.xmpp.username = jid.split('@')[0];
         settings.xmpp.domain = jid.split('@')[1].split('/')[0];
         settings.xmpp.resource = jid.split('@')[1].split('/')[1] || "";

         $.each(settings, function(key, val) {
            jsxc.options.set(key, val);
         });

         jsxc.options.xmpp.jid = jid;
         jsxc.options.xmpp.password = password;

         return settings;
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

         $(document).trigger('restoreCompleted.jsxc');
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

         if (jsxc.options.get('otr').enable) {
            // create or load DSA key and call _onMaster
            jsxc.otr.createDSA();
         } else {
            jsxc._onMaster();
         }
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

            $(document).trigger('restoreCompleted.jsxc');
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

         $(document).on('connectionReady.jsxc', function() {
            jsxc.gui.updateAvatar($('#jsxc_avatar'), jsxc.storage.getItem('jid'), 'own');
         });

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
         jsxc.warn('jsxc.jidToCid is deprecated!');

         var cid = Strophe.getBareJidFromJid(jid).replace('@', '-').replace(/\./g, '-').toLowerCase();

         return cid;
      },

      /**
       * Create comparable bar jid.
       * 
       * @memberOf jsxc
       * @param jid
       * @returns comparable bar jid
       */
      jidToBid: function(jid) {
         return Strophe.getBareJidFromJid(jid).toLowerCase();
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

         $.each(windows, function(index, bid) {
            var window = jsxc.storage.getUserItem('window', bid);

            if (!window) {
               jsxc.debug('Associated window-element is missing: ' + bid);
               return true;
            }

            jsxc.gui.window.init(bid);

            if (!window.minimize) {
               jsxc.gui.window.show(bid);
            } else {
               jsxc.gui.window.hide(bid);
            }

            jsxc.gui.window.setText(bid, window.text);
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

         if (form.find('#submit').length > 0) {
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
       * Removes all html tags.
       * 
       * @memberOf jsxc
       * @param text
       * @returns stripped text
       */
      removeHTML: function(text) {
         return $('<span>').html(text).text();
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
         var hidden = false;

         if (typeof document.hidden !== 'undefined') {
            hidden = document.hidden;
         } else if (typeof document.webkitHidden !== 'undefined') {
            hidden = document.webkitHidden;
         } else if (typeof document.mozHidden !== 'undefined') {
            hidden = document.mozHidden;
         } else if (typeof document.msHidden !== 'undefined') {
            hidden = document.msHidden;
         }

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
      },

      /**
       * Executes the given function in jsxc namespace.
       * 
       * @memberOf jsxc
       * @param {string} fnName Function name
       * @param {array} fnParams Function parameters
       * @returns Function return value
       */
      exec: function(fnName, fnParams) {
         var fnList = fnName.split('.');
         var fn = jsxc[fnList[0]];
         var i;
         for (i = 1; i < fnList.length; i++) {
            fn = fn[fnList[i]];
         }

         if (typeof fn === 'function') {
            return fn.apply(null, fnParams);
         }
      }
   };

   /**
    * Set some options for the chat.
    * 
    * @namespace jsxc.options
    */
   jsxc.options = {

      /** name of container application (e.g. owncloud or SOGo) */
      app_name: 'web applications',

      /** Timeout for the keepalive signal */
      timeout: 3000,

      /** Timeout for the keepalive signal if the master is busy */
      busyTimeout: 15000,

      /** OTR options */
      otr: {
         enable: true,
         ERROR_START_AKE: false,
         debug: false,
         SEND_WHITESPACE_TAG: true,
         WHITESPACE_START_AKE: true
      },

      /** xmpp options */
      xmpp: {
         url: null,
         jid: null,
         domain: null,
         password: null,
         overwrite: false,
         onlogin: true
      },

      /** default xmpp priorities */
      priority: {
         online: 0,
         chat: 0,
         away: 0,
         xa: 0,
         dnd: 0
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
         },

         /**
          * Action after connected: submit [String] Submit form, false [boolean]
          * Do nothing, continue [String] Start chat
          */
         onConnected: 'submit',

         /**
          * Action after auth fail: submit [String] Submit form, false [boolean]
          * Do nothing, ask [String] Show auth fail dialog
          */
         onAuthFail: 'submit'
      },

      /** jquery object from logout element */
      logoutElement: null,

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

      /** Absolute path root of JSXC installation */
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

      /** Mute notification sound? */
      muteNotification: false,

      /**
       * If no avatar is found, this function is called.
       * 
       * @param jid Jid of that user.
       * @this {jQuery} Elements to update with probable .jsxc_avatar elements
       */
      defaultAvatar: function() {

      },

      /**
       * Returns permanent saved settings and overwrite default jsxc.options.
       * 
       * @memberOf jsxc.options
       * @param username String username
       * @param password String password
       * @returns {object} at least xmpp.url
       */
      loadSettings: function() {

      },

      /**
       * Call this function to save user settings permanent.
       * 
       * @memberOf jsxc.options
       * @param data Holds all data as key/value
       * @returns {boolean} false if function failes
       */
      saveSettinsPermanent: function() {

      },

      carbons: {
         /** Enable carbon copies? */
         enable: false
      }
   };

   /**
    * Handle functions for chat window's and buddylist
    * 
    * @namespace jsxc.gui
    */
   jsxc.gui = {
      /** Smilie token to file mapping */
      emotions: [ [ 'O:-) O:)', 'angel' ], [ '>:-( >:( &gt;:-( &gt;:(', 'angry' ], [ ':-) :)', 'smile' ], [ ':-D :D', 'grin' ], [ ':-( :(', 'sad' ], [ ';-) ;)', 'wink' ], [ ':-P :P', 'tonguesmile' ], [ '=-O', 'surprised' ], [ ':kiss: :-*', 'kiss' ], [ '8-) :cool:', 'sunglassess' ], [ ':\'-( :\'( :&amp;apos;-(', 'crysad' ], [ ':-/', 'doubt' ], [ ':-X :X', 'zip' ], [ ':yes:', 'thumbsup' ], [ ':no:', 'thumbsdown' ], [ ':beer:', 'beer' ], [ ':devil:', 'devil' ], [ ':kiss: :kissing:', 'kissing' ], [ '@->-- :rose: @-&gt;--', 'rose' ], [ ':music:', 'music' ], [ ':love:', 'love' ], [ ':zzz:', 'tired' ] ],

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
         }
      },

      /**
       * Creates application skeleton.
       * 
       * @memberOf jsxc.gui
       */
      init: function() {
         //Prevent duplicate windowList
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
         ue.find('.jsxc_name').add(spot).text(data.name).attr('title', jsxc.l.is + ' ' + jsxc.CONST.STATUS[data.status]);

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

         if (typeof aid === 'undefined') {
            if (typeof jsxc.options.defaultAvatar === 'function') {
               jsxc.options.defaultAvatar.call(el, jid);
            }
            return;
         }

         var avatarSrc = jsxc.storage.getUserItem('avatar', aid);

         var setAvatar = function(src) {
            if (src === 0 || src === '0') {
               jsxc.options.defaultAvatar.call(el, jid);
               return;
            }

            el.find('.jsxc_avatar').removeAttr('style');

            el.find('.jsxc_avatar').css({
               'background-image': 'url(' + src + ')',
               'text-indent': '999px'
            });
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

         $('#jsxc_dialog').find('form').submit(function() {

            $(this).find('input[type=submit]').prop('disabled', true);

            jsxc.options.loginForm.form = $(this);
            jsxc.options.loginForm.jid = $(this).find('#jsxc_username');
            jsxc.options.loginForm.pass = $(this).find('#jsxc_password');

            var settings = jsxc.prepareLogin();

            jsxc.triggeredFromBox = true;
            jsxc.options.loginForm.triggered = false;

            if (settings === false) {
               jsxc.gui.showAuthFail();
            } else {
               jsxc.xmpp.login();
            }

            return false;
         });
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
               jsxc.otr.objects[bid].trust = true;
            }

            jsxc.storage.updateUserItem('buddy', bid, 'trust', true);

            jsxc.gui.dialog.close();

            jsxc.storage.updateUserItem('buddy', bid, 'trust', true);
            jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.conversation_is_now_verified);
            jsxc.gui.update(bid);
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
               jsxc.otr.sendSmpReq(bid, sec, quest);
            } else {
               jsxc.storage.setUserItem('smp_' + bid, {
                  sec: sec,
                  quest: quest
               });
            }

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.authentication_query_sent);
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
               jsxc.otr.sendSmpReq(bid, sec);
            } else {
               jsxc.storage.setUserItem('smp_' + bid, {
                  sec: sec,
                  quest: null
               });
            }

            jsxc.gui.dialog.close();

            jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.authentication_query_sent);
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

         $('#jsxc_dialog form').submit(function() {
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

         $('#jsxc_dialog .creation').click(function(ev) {
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
            $('#jsxc_dialog .creation').click(confirm);
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
       * @param {String} jid
       */
      showVcard: function(jid) {
         var bid = jsxc.jidToBid(jid);
         jsxc.gui.dialog.open(jsxc.gui.template.get('vCard', bid));

         var data = jsxc.storage.getUserItem('buddy', bid);

         if (data) {
            // Display resources and corresponding information
            var i, j, res, identities, identity = null, cap, client;
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

               $('#jsxc_dialog ul.jsxc_vCard').append('<li class="jsxc_sep"><strong>' + jsxc.translate('%%Resource%%') + ':</strong> ' + res + '</li>');
               $('#jsxc_dialog ul.jsxc_vCard').append('<li><strong>' + jsxc.translate('%%Client%%') + ':</strong> ' + client + '</li>');
               $('#jsxc_dialog ul.jsxc_vCard').append('<li>' + jsxc.translate('<strong>%%Status%%:</strong> %%' + jsxc.CONST.STATUS[status] + '%%') + '</li>');
            }
         }

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
            content += jsxc.translate('%%Sorry, your buddy doesn\'t provide any information.%%');
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
            $('.jsxc_fieldsetXmpp').hide();
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

            var err = jsxc.options.saveSettinsPermanent.call(this, data);

            if (typeof self.attr('data-onsubmit') === 'string') {
               jsxc.exec(self.attr('data-onsubmit'), [ err ]);
            }

            setTimeout(function() {
               self.find('input[type="submit"]').effect('highlight', {
                  color: (err) ? 'green' : 'red'
               }, 4000);
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
         jsxc.gui.showConfirmDialog(jsxc.translate("%%Should we notify you_%%"), function() {
            jsxc.gui.dialog.open(jsxc.gui.template.get('pleaseAccept'), {
               noClose: true
            });

            jsxc.notification.requestPermission();
         }, function() {
            $(document).trigger('notificationfailure.jsxc');
         });
      },

      showUnknownSender: function(bid) {
         jsxc.gui.showConfirmDialog(jsxc.translate('%%You_received_a_message_from_an_unknown_sender%% (' + bid + '). %%Do_you_want_to_display_them%%'), function() {

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
       * Switch read state to UNread.
       * 
       * @memberOf jsxc.gui
       * @param bid
       */
      unreadMsg: function(bid) {
         var win = jsxc.gui.window.get(bid);

         jsxc.gui.roster.getItem(bid).add(win).addClass('jsxc_unreadMsg');
         jsxc.storage.updateUserItem('window', bid, 'unread', true);
      },

      /**
       * Switch read state to read.
       * 
       * @memberOf jsxc.gui
       * @param bid
       */
      readMsg: function(bid) {
         var win = jsxc.gui.window.get(bid);

         if (win.hasClass('jsxc_unreadMsg')) {
            jsxc.gui.roster.getItem(bid).add(win).removeClass('jsxc_unreadMsg');
            jsxc.storage.updateUserItem('window', bid, 'unread', false);
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

         jsxc.gui.tooltip('#jsxc_roster');

         jsxc.notice.load();

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

         bud.find('.jsxc_delete').click(function() {
            jsxc.gui.showRemoveDialog(bid);
            return false;
         });

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

         $(document).trigger('add.roster.jsxc', [ bid, data, bud ]);
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
         var options = jsxc.gui.roster.getItem(bid).find('.jsxc_options, .jsxc_control');
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
            jsxc.gui.roster._rename(bid, $(this).val());

            $('html').off('click');
         });

         // Disable html click event, if click on input
         input.click(function() {
            return false;
         });

         $('html').one('click', function() {
            options.show();
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
            var d = jsxc.storage.getUserItem('buddy', bid);
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

         roster.animate({
            right: ((roster_width + roster_right) * -1) + 'px'
         }, duration);
         wl.animate({
            right: (10 - roster_right) + 'px'
         }, duration);

         $(document).trigger('toggle.roster.jsxc', [ state, duration ]);
      },

      /**
       * Shows a text with link to a login box that no connection exists.
       */
      noConnection: function() {
         $('#jsxc_roster').addClass('jsxc_noConnection');

         $('#jsxc_roster').append($('<p>' + jsxc.l.no_connection + '</p>').append(' <a>' + jsxc.l.relogin + '</a>').click(function() {
            jsxc.gui.showLoginBox();
         }));
      },

      /**
       * Shows a text with link to add a new buddy.
       * 
       * @memberOf jsxc.gui.roster
       */
      empty: function() {
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
               $('#jsxc_dialog .jsxc_close').click(function(ev) {
                  ev.preventDefault();

                  jsxc.gui.dialog.close();
               });

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
       * 
       * @param {Object} options e.g. width and height
       */
      resize: function(options) {
         $.colorbox.resize(options);
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
            win.find('.jsxc_textinput').focus();
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
               win.find('.jsxc_emoticons').css('top', (ui.size.height + 6) + 'px');
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
               unread: false
            });
         } else {

            if (jsxc.storage.getUserItem('window', bid).unread) {
               jsxc.gui.unreadMsg(bid);
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

         $(document).trigger('init.window.jsxc', [ win ]);

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
       * Open a window, related to the bid. If the window doesn't exist, it will
       * be created.
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
       */
      postMessage: function(bid, direction, msg, encrypted, forwarded, stamp) {
         var data = jsxc.storage.getUserItem('buddy', bid);
         var html_msg = msg;

         // remove html tags and reencode html tags
         msg = jsxc.removeHTML(msg);
         msg = jsxc.escapeHTML(msg);

         // exceptions:

         if (direction === 'out' && data.msgstate === OTR.CONST.MSGSTATE_FINISHED && forwarded !== true) {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_please_end_your_private_conversation;
         }

         if (direction === 'in' && data.msgstate === OTR.CONST.MSGSTATE_FINISHED) {
            direction = 'sys';
            msg = jsxc.l.unencrypted_message_received + ' ' + msg;
         }

         if (direction === 'out' && data.sub === 'from') {
            direction = 'sys';
            msg = jsxc.l.your_message_wasnt_send_because_you_have_no_valid_subscription;
         }

         encrypted = encrypted || data.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED;
         var post = jsxc.storage.saveMessage(bid, direction, msg, encrypted, forwarded, stamp);

         if (direction === 'in') {
            $(document).trigger('postmessagein.jsxc', [ bid, html_msg ]);
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
       * @param {Bool} restore If true no highlights are used and so unread flag
       *        set
       */
      _postMessage: function(bid, post, restore) {
         var win = jsxc.gui.window.get(bid);
         var msg = post.msg;
         var direction = post.direction;
         var uid = post.uid;

         if (win.find('.jsxc_textinput').is(':not(:focus)') && jsxc.restoreCompleted && direction === 'in' && !restore) {
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
               var esc = '', i;
               for (i = 0; i < p1.length; i++) {
                  esc += '&#' + p1.charCodeAt(i) + ';';
               }

               return '<div title="' + esc + '" class="jsxc_emoticon jsxc_' + val[1] + '"/>';
            });
         });

         var msgDiv = $("<div>"), msgTsDiv = $("<div>");
         msgDiv.addClass('jsxc_chatmessage jsxc_' + direction);
         msgDiv.attr('id', uid);
         msgDiv.html('<div>' + msg + '</div>');
         msgTsDiv.addClass('jsxc_timestamp');
         msgTsDiv.html(jsxc.getFormattedTime(post.stamp));

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

         jsxc.gui.detectUriScheme(win);
         jsxc.gui.detectEmail(win);

         jsxc.gui.window.scrollDown(bid);

         // if window has no focus set unread flag
         if (!win.find('.jsxc_textinput').is(':focus') && jsxc.restoreCompleted && !restore) {
            jsxc.gui.unreadMsg(bid);
         }
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
       * @param {type} bid
       * @param {type} msg
       * @returns {String} HTML Template
       */
      get: function(name, bid, msg) {

         // common placeholder
         var ph = {
            my_priv_fingerprint: jsxc.storage.getUserItem('priv_fingerprint') ? jsxc.storage.getUserItem('priv_fingerprint').replace(/(.{8})/g, '$1 ') : jsxc.l.not_available,
            my_jid: jsxc.storage.getItem('jid') || '',
            my_node: Strophe.getNodeFromJid(jsxc.storage.getItem('jid') || '') || '',
            root: jsxc.options.root,
            app_name: jsxc.options.app_name
         };

         // placeholder depending on bid
         if (bid) {
            var data = jsxc.storage.getUserItem('buddy', bid);

            $.extend(ph, {
               bid_priv_fingerprint: (data && data.fingerprint) ? data.fingerprint.replace(/(.{8})/g, '$1 ') : jsxc.l.not_available,
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

         if (typeof (ret) === 'string') {
            ret = jsxc.translate(ret);

            ret = ret.replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, function(s, key) {
               return (typeof ph[key] === 'string') ? ph[key] : s;
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
              <span style="text-transform:uppercase">{{bid_priv_fingerprint}}</span></p><br />\
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
          <span style="text-transform:uppercase">{{bid_priv_fingerprint}}</span></p><br />\
          <p class="jsxc_right"><a href="#" class="button jsxc_close">%%Close%%</a></p>\
        </div>',
      chatWindow: '<li class="jsxc_min jsxc_windowItem">\
            <div class="jsxc_window">\
                <div class="jsxc_bar">\
                     <div class="jsxc_avatar">☺</div>\
                     <div class="jsxc_tools">\
                           <div class="jsxc_settings">\
                               <ul>\
                                   <li class="jsxc_fingerprints jsxc_otr jsxc_disabled">%%Fingerprints%%</li>\
                                   <li class="jsxc_verification">%%Authentication%%</li>\
                                   <li class="jsxc_transfer jsxc_otr jsxc_disabled">%%start_private%%</li>\
                                   <li class="jsxc_clear">%%clear_history%%</li>\
                               </ul>\
                           </div>\
                           <div class="jsxc_transfer jsxc_otr jsxc_disabled"/>\
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
           <div class="jsxc_bottom jsxc_presence" data-bid="own">\
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
            </div>\
            <div id="jsxc_windowListSB">\
               <div class="jsxc_scrollLeft jsxc_disabled">&lt;</div>\
               <div class="jsxc_scrollRight jsxc_disabled">&gt;</div>\
            </div>',
      rosterBuddy: '<li>\
            <div class="jsxc_avatar">☺</div>\
            <div class="jsxc_control"></div>\
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
        <form>\
            <p><label for="jsxc_username">%%Username%%:</label>\
               <input type="text" name="username" id="jsxc_username" required="required" value="{{my_node}}"/></p>\
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
            <input type="text" name="username" id="jsxc_username" pattern="^[^\\x22&\'\\/:<>@\\s]+(@[.\\-_\\w]+)?" required="required" /></p>\
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
      waitAlert: '<h3>{{msg}}</h3>\
        <p>%%Please_wait%%</p>\
        <p class="jsxc_center"><img src="{{root}}/img/loading.gif" alt="wait" width="32px" height="32px" /></p>',
      alert: '<h3>%%Alert%%</h3>\
        <p>{{msg}}</p>\
        <p class="jsxc_right"><a href="#" class="button jsxc_close jsxc_cancel">%%Ok%%</a></p>',
      authFailDialog: '<h3>%%Login_failed%%</h3>\
        <p>%%Sorry_we_cant_authentikate_%%</p>\
        <p class="jsxc_right">\
            <a class="button jsxc_cancel">%%Continue_without_chat%%</a>\
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
         Real-time chat app for {{app_name}} and more.<br />\
         Requires an external <a href="https://xmpp.org/xmpp-software/servers/" target="_blank">XMPP server</a>.<br />\
         <br />\
         <b>Credits: </b> <a href="http://www.beepzoid.com/old-phones/" target="_blank">David English (Ringtone)</a>,\
         <a href="https://soundcloud.com/freefilmandgamemusic/ping-1?in=freefilmandgamemusic/sets/free-notification-sounds-and" target="_blank">CameronMusic (Ping)</a></p>\
         <p class="jsxc_right"><a class="button jsxc_debuglog" href="#">Show debug log</a></p>',
      vCard: '<h3>%%Info_about%% {{bid_name}}</h3>\
         <ul class="jsxc_vCard"></ul>\
         <p><img src="{{root}}/img/loading.gif" alt="wait" width="32px" height="32px" /> %%Please_wait%%...</p>',
      settings: '<h3>%%User_settings%%</h3>\
         <p></p>\
         <form>\
            <fieldset class="jsxc_fieldsetXmpp jsxc_fieldset">\
               <legend>%%Login options%%</legend>\
               <label for="xmpp-url">%%BOSH url%%</label><input type="text" id="xmpp-url" readonly="readonly"/><br />\
               <label for="xmpp-username">%%Username%%</label><input type="text" id="xmpp-username"/><br />\
               <label for="xmpp-domain">%%Domain%%</label><input type="text" id="xmpp-domain"/><br />\
               <label for="xmpp-resource">%%Resource%%</label><input type="text" id="xmpp-resource"/><br />\
               <label for="xmpp-onlogin">%%On login%%</label><input type="checkbox" id="xmpp-onlogin" /><br />\
               <input type="submit" value="%%Save%%"/>\
            </fieldset>\
         </form>\
         <p></p>\
         <form>\
            <fieldset class="jsxc_fieldsetPriority jsxc_fieldset">\
               <legend>%%Priority%%</legend>\
               <label for="priority-online">%%Online%%</label><input type="number" value="0" id="priority-online" min="-128" max="127" step="1" required="required"/><br />\
               <label for="priority-chat">%%Chatty%%</label><input type="number" value="0" id="priority-chat" min="-128" max="127" step="1" required="required"/><br />\
               <label for="priority-away">%%Away%%</label><input type="number" value="0" id="priority-away" min="-128" max="127" step="1" required="required"/><br />\
               <label for="priority-xa">%%Extended_away%%</label><input type="number" value="0" id="priority-xa" min="-128" max="127" step="1" required="required"/><br />\
               <label for="priority-dnd">%%dnd%%</label><input type="number" value="0" id="priority-dnd" min="-128" max="127" step="1" required="required"/><br />\
               <input type="submit" value="%%Save%%"/>\
            </fieldset>\
         </form>\
         <p></p>\
         <form data-onsubmit="xmpp.carbons.refresh">\
            <fieldset class="jsxc_fieldsetCarbons jsxc_fieldset">\
               <legend>%%Carbon copy%%</legend>\
               <label for="carbons-enable">%%Enable%%</label><input type="checkbox" id="carbons-enable" /><br />\
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
       * @name login
       * @memberOf jsxc.xmpp
       */
      /**
       * Create new connection with given parameters.
       * 
       * @name login^2
       * @param {string} jid
       * @param {string} password
       * @memberOf jsxc.xmpp
       */
      /**
       * Attach connection with given parameters.
       * 
       * @name login^3
       * @param {string} jid
       * @param {string} sid
       * @param {string} rid
       * @memberOf jsxc.xmpp
       */
      login: function() {

         if (jsxc.xmpp.conn && jsxc.xmpp.conn.connected) {
            return;
         }

         var jid = null, password = null, sid = null, rid = null;

         switch (arguments.length) {
            case 2:
               jid = arguments[0];
               password = arguments[1];
               break;
            case 3:
               jid = arguments[0];
               sid = arguments[1];
               rid = arguments[2];
               break;
            default:
               jid = jsxc.storage.getItem('jid');
               sid = jsxc.storage.getItem('sid');
               rid = jsxc.storage.getItem('rid');
         }

         var url = jsxc.options.get('xmpp').url;

         // Register eventlistener
         $(document).on('connected.jsxc', jsxc.xmpp.connected);
         $(document).on('attached.jsxc', jsxc.xmpp.attached);
         $(document).on('disconnected.jsxc', jsxc.xmpp.disconnected);
         $(document).on('ridChange', jsxc.xmpp.onRidChange);
         $(document).on('connfail.jsxc', jsxc.xmpp.onConnfail);
         $(document).on('authfail.jsxc', jsxc.xmpp.onAuthFail);

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

         var callback = function(status, condition) {

            jsxc.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

            switch (status) {
               case Strophe.Status.CONNECTED:
                  jsxc.bid = jsxc.jidToBid(jsxc.xmpp.conn.jid.toLowerCase());
                  $(document).trigger('connected.jsxc');
                  break;
               case Strophe.Status.ATTACHED:
                  $(document).trigger('attached.jsxc');
                  break;
               case Strophe.Status.DISCONNECTED:
                  $(document).trigger('disconnected.jsxc');
                  break;
               case Strophe.Status.CONNFAIL:
                  $(document).trigger('connfail.jsxc');
                  break;
               case Strophe.Status.AUTHFAIL:
                  $(document).trigger('authfail.jsxc');
                  break;
            }
         };

         if (jsxc.xmpp.conn.caps) {
            jsxc.xmpp.conn.caps.node = 'http://jsxc.org/';
         }

         if (jsxc.restore && sid && rid) {
            jsxc.debug('Try to attach');
            jsxc.debug('SID: ' + sid);
            jsxc.xmpp.conn.attach(jid, sid, rid, callback);
         } else {
            jsxc.debug('New connection');

            if (jsxc.xmpp.conn.caps) {
               // Add system handler, because user handler isn't called before
               // we are authenticated
               jsxc.xmpp.conn._addSysHandler(function(stanza) {
                  var from = jsxc.xmpp.conn.domain, c = stanza.querySelector('c'), ver = c.getAttribute('ver'), node = c.getAttribute('node');

                  var _jidNodeIndex = JSON.parse(localStorage.getItem('strophe.caps._jidNodeIndex')) || {};

                  jsxc.xmpp.conn.caps._jidVerIndex[from] = ver;
                  _jidNodeIndex[from] = node;

                  localStorage.setItem('strophe.caps._jidVerIndex', JSON.stringify(jsxc.xmpp.conn.caps._jidVerIndex));
                  localStorage.setItem('strophe.caps._jidNodeIndex', JSON.stringify(_jidNodeIndex));
               }, Strophe.NS.CAPS);
            }

            jsxc.xmpp.conn.connect(jid || jsxc.options.xmpp.jid, password || jsxc.options.xmpp.password, callback);
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

         // restore all otr objects
         $.each(jsxc.storage.getUserItem('otrlist') || {}, function(i, val) {
            jsxc.otr.create(val);
         });

         var numOtr = Object.keys(jsxc.otr.objects || {}).length + 1;
         var disReady = function() {
            if (--numOtr <= 0) {
               jsxc.xmpp.conn.flush();

               setTimeout(function() {
                  jsxc.xmpp.conn.disconnect();
               }, 600);
            }
         };

         // end all private conversations
         $.each(jsxc.otr.objects || {}, function(key, obj) {
            if (obj.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED) {
               obj.endOtr.call(obj, function() {
                  obj.init.call(obj);
                  jsxc.otr.backup(key);

                  disReady();
               });
            } else {
               disReady();
            }
         });

         disReady();

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

         var nomJid = Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid).toLowerCase() + '/' + Strophe.getResourceFromJid(jsxc.xmpp.conn.jid);

         // Save sid and jid
         jsxc.storage.setItem('sid', jsxc.xmpp.conn._proto.sid);
         jsxc.storage.setItem('jid', nomJid);

         jsxc.storage.setItem('lastActivity', (new Date()).getTime());

         // make shure roster will be reloaded
         jsxc.storage.removeUserItem('buddylist');

         jsxc.storage.removeUserItem('windowlist');
         jsxc.storage.removeUserItem('own');
         jsxc.storage.removeUserItem('avatar', 'own');
         jsxc.storage.removeUserItem('otrlist');

         if (jsxc.options.loginForm.triggered) {
            switch (jsxc.options.loginForm.onConnected || 'submit') {
               case 'submit':
                  jsxc.submitLoginForm();
                  /* falls through */
               case false:
                  jsxc.xmpp.connectionReady();
                  return;
            }
         }

         // start chat

         jsxc.gui.init();
         $('#jsxc_roster').removeClass('jsxc_noConnection');
         jsxc.onMaster();
         jsxc.xmpp.conn.resume();
         jsxc.gui.dialog.close();
         $(document).trigger('attached.jsxc');
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

         var caps = jsxc.xmpp.conn.caps;
         var domain = jsxc.xmpp.conn.domain;

         if (caps && jsxc.options.get('carbons').enable) {
            var conditionalEnable = function() {
               if (jsxc.xmpp.conn.caps.hasFeatureByJid(domain, jsxc.CONST.NS.CARBONS)) {
                  jsxc.xmpp.carbons.enable();
               }
            };

            if (typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
               var _jidNodeIndex = JSON.parse(localStorage.getItem('strophe.caps._jidNodeIndex')) || {};

               $(document).on('caps.strophe', function onCaps(ev, from) {

                  if (from !== domain) {
                     return;
                  }

                  conditionalEnable();

                  $(document).off('caps.strophe', onCaps);
               });

               caps._requestCapabilities(jsxc.xmpp.conn.domain, _jidNodeIndex[domain], caps._jidVerIndex[domain]);
            } else {
               // We know server caps
               conditionalEnable();
            }
         }

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
         jsxc.storage.removeUserItem('avatar', 'own');
         jsxc.storage.removeUserItem('otrlist');

         $(document).off('connected.jsxc', jsxc.xmpp.connected);
         $(document).off('attached.jsxc', jsxc.xmpp.attached);
         $(document).off('disconnected.jsxc', jsxc.xmpp.disconnected);
         $(document).off('ridChange', jsxc.xmpp.onRidChange);
         $(document).off('connfail.jsxc', jsxc.xmpp.onConnfail);
         $(document).off('authfail.jsxc', jsxc.xmpp.onAuthFail);

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
      onConnfail: function(ev, condition) {
         jsxc.debug('XMPP connection failed: ' + condition);

         if (jsxc.options.loginForm.triggered) {
            jsxc.submitLoginForm();
         }
      },

      /**
       * Triggered on auth fail.
       * 
       * @private
       */
      onAuthFail: function() {
         if (jsxc.options.loginForm.triggered) {
            switch (jsxc.options.loginForm.onAuthFail || 'ask') {
               case 'ask':
                  jsxc.gui.showAuthFail();
                  break;
               case 'submit':
                  jsxc.submitLoginForm();
                  break;
            }
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
            var bid = jsxc.jidToBid(jid);
            var sub = $(this).attr('subscription');

            buddies.push(bid);

            jsxc.storage.removeUserItem('res', bid);

            jsxc.storage.saveBuddy(bid, {
               jid: jid,
               name: name,
               status: 0,
               sub: sub,
               res: []
            });

            jsxc.gui.roster.add(bid);
         });

         if (buddies.length === 0) {
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
            var bid = jsxc.jidToBid(jid);
            var sub = $(this).attr('subscription');
            // var ask = $(this).attr('ask');

            if (sub === 'remove') {
               jsxc.gui.roster.purge(bid);
            } else {
               var bl = jsxc.storage.getUserItem('buddylist');

               if (bl.indexOf(bid) < 0) {
                  bl.push(bid); // (INFO) push returns the new length
                  jsxc.storage.setUserItem('buddylist', bl);
               }

               var temp = jsxc.storage.saveBuddy(bid, {
                  jid: jid,
                  name: name,
                  sub: sub
               });

               if (temp === 'updated') {

                  jsxc.gui.update(bid);
                  jsxc.gui.roster.reorder(bid);
               } else {
                  jsxc.gui.roster.add(bid);
               }
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
         var r = Strophe.getResourceFromJid(from);
         var bid = jsxc.jidToBid(jid);
         var data = jsxc.storage.getUserItem('buddy', bid);
         var res = jsxc.storage.getUserItem('res', bid) || {};
         var status = null;
         var xVCard = $(presence).find('x[xmlns="vcard-temp:x:update"]');

         if (jid === Strophe.getBareJidFromJid(jsxc.storage.getItem("jid"))) {
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

         if (data.status === 0 && max > 0) {
            // buddy has come online
            jsxc.notification.notify(data.name, jsxc.translate('%%has come online%%.'));
         }

         data.status = max;
         data.res = maxVal;
         data.jid = jid;

         // Looking for avatar
         if (xVCard.length > 0) {
            var photo = xVCard.find('photo');

            if (photo.length > 0 && photo.text() !== data.avatar) {
               jsxc.storage.removeUserItem('avatar', data.avatar);
               data.avatar = photo.text();
            }
         }

         // Reset jid
         if (jsxc.gui.window.get(bid).length > 0) {
            jsxc.gui.window.get(bid).data('jid', jid);
         }

         jsxc.storage.setUserItem('buddy', bid, data);
         jsxc.storage.setUserItem('res', bid, res);

         jsxc.debug('Presence (' + from + '): ' + status);

         jsxc.gui.update(bid);
         jsxc.gui.roster.reorder(bid);

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
      onMessage: function(stanza) {

         var forwarded = $(stanza).find('forwarded[xmlns="' + jsxc.CONST.NS.FORWARD + '"]');
         var message, carbon;

         if (forwarded.length > 0) {
            message = forwarded.find('> message');
            forwarded = true;
            carbon = $(stanza).find('> [xmlns="' + jsxc.CONST.NS.CARBONS + '"]');

            if (carbon.length === 0) {
               carbon = false;
            }

            jsxc.debug('Incoming forwarded message', message);
         } else {
            message = stanza;
            forwarded = false;
            carbon = false;

            jsxc.debug('Incoming message', message);
         }

         var body = $(message).find('body:first').text();

         if (!body || (body.match(/\?OTR/i) && forwarded)) {
            return true;
         }

         var type = $(message).attr('type');
         var from = $(message).attr('from');
         var mid = $(message).attr('id');
         var bid;

         var delay = $(message).find('delay[xmlns="urn:xmpp:delay"]');

         var stamp = (delay.length > 0) ? new Date(delay.attr('stamp')) : new Date();
         stamp = stamp.getTime();

         if (carbon) {
            var direction = (carbon.prop("tagName") === 'sent') ? 'out' : 'in';
            bid = jsxc.jidToBid((direction === 'out') ? $(message).attr('to') : from);

            jsxc.gui.window.postMessage(bid, direction, body, false, forwarded, stamp);

            return true;

         } else if (forwarded) {
            // Someone forwarded a message to us

            body = from + jsxc.translate(' %%to%% ') + $(stanza).attr('to') + '"' + body + '"';

            from = $(stanza).attr('from');
         }

         var jid = Strophe.getBareJidFromJid(from);
         bid = jsxc.jidToBid(jid);
         var data = jsxc.storage.getUserItem('buddy', bid);
         var request = $(message).find("request[xmlns='urn:xmpp:receipts']");

         if (data === null) {
            // jid not in roster

            var chat = jsxc.storage.getUserItem('chat', bid) || [];

            if (chat.length === 0) {
               jsxc.notice.add('%%Unknown sender%%', '%%You received a message from an unknown sender%% (' + bid + ').', 'gui.showUnknownSender', [ bid ]);
            }

            var msg = jsxc.removeHTML(body);
            msg = jsxc.escapeHTML(msg);

            jsxc.storage.saveMessage(bid, 'in', msg, false, forwarded, stamp);

            return true;
         }

         var win = jsxc.gui.window.init(bid);

         // If we now the full jid, we use it
         if (type === 'chat') {
            win.data('jid', from);
            jsxc.storage.updateUserItem('buddy', bid, {
               jid: from
            });
         }

         $(document).trigger('message.jsxc', [ from, body ]);

         // create related otr object
         if (jsxc.master && !jsxc.otr.objects[bid]) {
            jsxc.otr.create(bid);
         }

         if (!forwarded && mid !== null && request.length && data !== null && (data.sub === 'both' || data.sub === 'from') && type === 'chat') {
            // Send received according to XEP-0184
            jsxc.xmpp.conn.send($msg({
               to: from
            }).c('received', {
               xmlns: 'urn:xmpp:receipts',
               id: mid
            }));
         }

         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].receiveMsg(body, {
               stamp: stamp,
               forwarded: forwarded
            });
         } else {
            jsxc.gui.window.postMessage(bid, 'in', body, false, forwarded, stamp);
         }

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
         var bid = jsxc.jidToBid(username);

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

            jsxc.storage.removeUserItem('add_' + bid);
         } else {
            jsxc.storage.setUserItem('add_' + bid, {
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
         var bid = jsxc.jidToBid(jid);

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

         jsxc.gui.roster.purge(bid);
      },

      onReceived: function(message) {
         var from = $(message).attr('from');
         var jid = Strophe.getBareJidFromJid(from);
         var bid = jsxc.jidToBid(jid);
         var received = $(message).find("received[xmlns='urn:xmpp:receipts']");

         if (received.length) {
            var receivedId = received.attr('id').replace(/:/, '-');
            var chat = jsxc.storage.getUserItem('chat', bid);
            var i;

            for (i = chat.length - 1; i >= 0; i--) {
               if (chat[i].uid === receivedId) {
                  chat[i].received = true;

                  $('#' + receivedId).addClass('jsxc_received');

                  jsxc.storage.setUserItem('chat', bid, chat);
                  break;
               }
            }
         }

         return true;
      },

      /**
       * Public function to send message.
       * 
       * @memberOf jsxc.xmpp
       * @param bid css jid of user
       * @param msg message
       * @param uid unique id
       */
      sendMessage: function(bid, msg, uid) {
         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].sendMsg(msg, uid);
         } else {
            jsxc.xmpp._sendMessage(jsxc.gui.window.get(bid).data('jid'), msg, uid);
         }
      },

      /**
       * Create message stanza and send it.
       * 
       * @memberOf jsxc.xmpp
       * @param jid Jabber id
       * @param msg Message
       * @param uid unique id
       * @private
       */
      _sendMessage: function(jid, msg, uid) {
         var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(jid)) || {};
         var isBar = (Strophe.getBareJidFromJid(jid) === jid);
         var type = data.type || 'chat';

         var xmlMsg = $msg({
            to: jid,
            type: type,
            id: uid
         }).c('body').t(msg);

         if (jsxc.xmpp.carbons.enabled && msg.match(/^\?OTR/)) {
            xmlMsg.up().c("private", {
               xmlns: jsxc.CONST.NS.CARBONS
            });
         }

         if (type === 'chat' && (isBar || jsxc.xmpp.conn.caps.hasFeatureByJid(jid, Strophe.NS.RECEIPTS))) {
            // Add request according to XEP-0184
            xmlMsg.up().c('request', {
               xmlns: 'urn:xmpp:receipts'
            });
         }

         jsxc.xmpp.conn.send(xmlMsg);
      },

      /**
       * This function loads a vcard.
       * 
       * @memberOf jsxc.xmpp
       * @param bid
       * @param cb
       * @param error_cb
       */
      loadVcard: function(bid, cb, error_cb) {
         if (jsxc.master) {
            jsxc.xmpp.conn.vcard.get(cb, bid, error_cb);
         } else {
            jsxc.storage.setUserItem('vcard', bid, 'request:' + (new Date()).getTime());

            $(document).one('loaded.vcard.jsxc', function(ev, result) {
               if (result && result.state === 'success') {
                  cb($(result.data).get(0));
               } else {
                  error_cb();
               }
            });
         }
      },

      /**
       * Retrieves capabilities.
       * 
       * @memberOf jsxc.xmpp
       * @param jid
       * @returns List of known capabilities
       */
      getCapabilitiesByJid: function(jid) {
         if (jsxc.xmpp.conn) {
            return jsxc.xmpp.conn.caps.getCapabilitiesByJid(jid);
         }

         var jidVerIndex = JSON.parse(localStorage.getItem('strophe.caps._jidVerIndex')) || {};
         var knownCapabilities = JSON.parse(localStorage.getItem('strophe.caps._knownCapabilities')) || {};

         if (jidVerIndex[jid]) {
            return knownCapabilities[jidVerIndex[jid]];
         }

         return null;
      }
   };

   /**
    * Handle carbons (XEP-0280);
    * 
    * @namespace jsxc.xmpp.carbons
    */
   jsxc.xmpp.carbons = {
      enabled: false,

      /**
       * Enable carbons.
       * 
       * @memberOf jsxc.xmpp.carbons
       * @param cb callback
       */
      enable: function(cb) {
         var iq = $iq({
            type: 'set'
         }).c('enable', {
            xmlns: jsxc.CONST.NS.CARBONS
         });

         jsxc.xmpp.conn.sendIQ(iq, function() {
            jsxc.xmpp.carbons.enabled = true;

            jsxc.debug('Carbons enabled');

            if (cb) {
               cb.call(this);
            }
         }, function(stanza) {
            jsxc.warn('Could not enable carbons', stanza);
         });
      },

      /**
       * Disable carbons.
       * 
       * @memberOf jsxc.xmpp.carbons
       * @param cb callback
       */
      disable: function(cb) {
         var iq = $iq({
            type: 'set'
         }).c('disable', {
            xmlns: jsxc.CONST.NS.CARBONS
         });

         jsxc.xmpp.conn.sendIQ(iq, function() {
            jsxc.xmpp.carbons.enabled = false;

            jsxc.debug('Carbons disabled');

            if (cb) {
               cb.call(this);
            }
         }, function(stanza) {
            jsxc.warn('Could not disable carbons', stanza);
         });
      },

      /**
       * Enable/Disable carbons depending on options key.
       * 
       * @memberOf jsxc.xmpp.carbons
       * @param err error message
       */
      refresh: function(err) {
         if (err === false) {
            return;
         }

         if (jsxc.options.get('carbons').enable) {
            return jsxc.xmpp.carbons.enable();
         }

         return jsxc.xmpp.carbons.disable();
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
      PREFIX: 'jsxc',

      SEP: ':',

      /**
       * @param {type} uk Should we generate a user prefix?
       * @returns {String} prefix
       * @memberOf jsxc.storage
       */
      getPrefix: function(uk) {
         var self = jsxc.storage;

         return self.PREFIX + self.SEP + ((uk && jsxc.bid) ? jsxc.bid + self.SEP : '');
      },

      /**
       * Save item to storage
       * 
       * @function
       * @param {String} key variablename
       * @param {Object} value value
       * @param {String} uk Userkey? Should we add the bid as prefix?
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

      setUserItem: function(type, key, value) {
         var self = jsxc.storage;

         if (arguments.length === 2) {
            value = key;
            key = type;
            type = '';
         } else if (arguments.length === 3) {
            key = type + self.SEP + key;
         }

         return jsxc.storage.setItem(key, value, true);
      },

      /**
       * Load item from storage
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the bid as prefix?
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
       * @returns user item
       */
      getUserItem: function(type, key) {
         var self = jsxc.storage;

         if (arguments.length === 1) {
            key = type;
         } else if (arguments.length === 2) {
            key = type + self.SEP + key;
         }

         return jsxc.storage.getItem(key, true);
      },

      /**
       * Remove item from storage
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the bid as prefix?
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
       */
      removeUserItem: function(type, key) {
         var self = jsxc.storage;

         if (arguments.length === 1) {
            key = type;
         } else if (arguments.length === 2) {
            key = type + self.SEP + key;
         }

         jsxc.storage.removeItem(key, true);
      },

      /**
       * Updates value of a variable in a saved object.
       * 
       * @function
       * @param {String} key variablename
       * @param {String|object} variable variablename in object or object with
       *        variable/key pairs
       * @param {Object} [value] value
       * @param {String} uk Userkey? Should we add the bid as prefix?
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
      updateUserItem: function(type, key, variable, value) {
         var self = jsxc.storage;

         if (arguments.length === 4 || (arguments.length === 3 && typeof variable === 'object')) {
            key = type + self.SEP + key;
         } else {
            value = variable;
            variable = key;
            key = type;
         }

         return jsxc.storage.updateItem(key, variable, value, true);
      },

      /**
       * Inkrements value
       * 
       * @function
       * @param {String} key variablename
       * @param {String} uk Userkey? Should we add the bid as prefix?
       */
      ink: function(key, uk) {

         jsxc.storage.setItem(key, Number(jsxc.storage.getItem(key, uk)) + 1, uk);
      },

      /**
       * Remove element from array or object
       * 
       * @param {string} key name of array or object
       * @param {string} name name of element in array or object
       * @param {String} uk Userkey? Should we add the bid as prefix?
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

      removeUserElement: function(type, key, name) {
         var self = jsxc.storage;

         if (arguments.length === 2) {
            name = key;
            key = type;
         } else if (arguments.length === 3) {
            key = type + self.SEP + key;
         }

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
         if (e.key === jsxc.storage.PREFIX + jsxc.storage.SEP + 'rid' || e.key === jsxc.storage.PREFIX + jsxc.storage.SEP + 'lastActivity') {
            return;
         }

         var re = new RegExp('^' + jsxc.storage.PREFIX + jsxc.storage.SEP + '(?:[^' + jsxc.storage.SEP + ']+@[^' + jsxc.storage.SEP + ']+' + jsxc.storage.SEP + ')?(.*)', 'i');
         var key = e.key.replace(re, '$1');

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
         var bid = key.replace(new RegExp('[^' + jsxc.storage.SEP + ']+' + jsxc.storage.SEP + '(.*)', 'i'), '$1');

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

         if (key.match(new RegExp('^chat' + jsxc.storage.SEP))) {

            var posts = JSON.parse(e.newValue);
            var data, el;

            while (posts.length > 0) {
               data = posts.pop();
               el = $('#' + data.uid);

               if (el.length === 0) {
                  if (jsxc.master && data.direction === 'out') {
                     jsxc.xmpp.sendMessage(bid, data.msg, data.uid);
                  }

                  jsxc.gui.window._postMessage(bid, data);
               } else if (data.received) {
                  el.addClass('jsxc_received');
               }
            }
            return;
         }

         if (key.match(new RegExp('^window' + jsxc.storage.SEP))) {

            if (!e.newValue) {
               jsxc.gui.window._close(bid);
               return;
            }

            if (!e.oldValue) {
               jsxc.gui.window.open(bid);
               return;
            }

            n = JSON.parse(e.newValue);

            if (n.minimize) {
               jsxc.gui.window._hide(bid);
            } else {
               jsxc.gui.window._show(bid);
            }

            jsxc.gui.window.setText(bid, n.text);

            return;
         }

         if (key.match(new RegExp('^smp' + jsxc.storage.SEP))) {

            if (!e.newValue) {

               jsxc.gui.dialog.close();

               if (jsxc.master) {
                  jsxc.otr.objects[bid].sm.abort();
               }

               return;
            }

            n = JSON.parse(e.newValue);

            if (typeof (n.data) !== 'undefined') {

               jsxc.otr.onSmpQuestion(bid, n.data);

            } else if (jsxc.master && n.sec) {
               jsxc.gui.dialog.close();

               jsxc.otr.sendSmpReq(bid, n.sec, n.quest);
            }
         }

         if (!jsxc.master && key.match(new RegExp('^buddy' + jsxc.storage.SEP))) {

            if (!e.newValue) {
               jsxc.gui.roster.purge(bid);
               return;
            }
            if (!e.oldValue) {
               jsxc.gui.roster.add(bid);
               return;
            }

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            jsxc.gui.update(bid);

            if (o.status !== n.status || o.sub !== n.sub) {
               jsxc.gui.roster.reorder(bid);
            }
         }

         if (jsxc.master && key.match(new RegExp('^deletebuddy' + jsxc.storage.SEP)) && e.newValue) {
            n = JSON.parse(e.newValue);

            jsxc.xmpp.removeBuddy(n.jid);
            jsxc.storage.removeUserItem(key);
         }

         if (jsxc.master && key.match(new RegExp('^buddy' + jsxc.storage.SEP))) {

            n = JSON.parse(e.newValue);
            o = JSON.parse(e.oldValue);

            if (o.transferReq !== n.transferReq) {
               jsxc.storage.updateUserItem('buddy', bid, 'transferReq', -1);

               if (n.transferReq === 0) {
                  jsxc.otr.goPlain(bid);
               }
               if (n.transferReq === 1) {
                  jsxc.otr.goEncrypt(bid);
               }
            }

            if (o.name !== n.name) {
               jsxc.gui.roster._rename(bid, n.name);
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

         if (jsxc.master && key.match(new RegExp('^add' + jsxc.storage.SEP))) {
            n = JSON.parse(e.newValue);

            jsxc.xmpp.addBuddy(n.username, n.alias);
         }

         if (key === 'roster') {
            jsxc.gui.roster.toggle();
         }

         if (jsxc.master && key.match(new RegExp('^vcard' + jsxc.storage.SEP)) && e.newValue !== null && e.newValue.match(/^request:/)) {

            jsxc.xmpp.loadVcard(bid, function(stanza) {
               jsxc.storage.setUserItem('vcard', bid, {
                  state: 'success',
                  data: $('<div>').append(stanza).html()
               });
            }, function() {
               jsxc.storage.setUserItem('vcard', bid, {
                  state: 'error'
               });
            });
         }

         if (!jsxc.master && key.match(new RegExp('^vcard' + jsxc.storage.SEP)) && e.newValue !== null && !e.newValue.match(/^request:/)) {
            n = JSON.parse(e.newValue);

            if (typeof n.state !== 'undefined') {
               $(document).trigger('loaded.vcard.jsxc', n);
            }

            jsxc.storage.removeUserItem('vcard', bid);
         }
      },

      /**
       * Save message to storage.
       * 
       * @memberOf jsxc.storage
       * @param bid
       * @param direction
       * @param msg
       * @param encrypted
       * @param forwarded
       * @return post
       */
      saveMessage: function(bid, direction, msg, encrypted, forwarded, stamp) {
         var chat = jsxc.storage.getUserItem('chat', bid) || [];

         var uid = new Date().getTime() + ':msg';

         if (chat.length > jsxc.options.get('numberOfMsg')) {
            chat.pop();
         }

         var post = {
            direction: direction,
            msg: msg,
            uid: uid.replace(/:/, '-'),
            received: false,
            encrypted: encrypted || false,
            forwarded: forwarded || false,
            stamp: stamp || new Date().getTime()
         };

         chat.unshift(post);
         jsxc.storage.setUserItem('chat', bid, chat);

         return post;
      },

      /**
       * Save or update buddy data.
       * 
       * @memberOf jsxc.storage
       * @param bid
       * @param data
       * @returns {String} Updated or created
       */
      saveBuddy: function(bid, data) {

         if (jsxc.storage.getUserItem('buddy', bid)) {
            jsxc.storage.updateUserItem('buddy', bid, data);

            return 'updated';
         }

         jsxc.storage.setUserItem('buddy', bid, $.extend({
            jid: '',
            name: '',
            status: 0,
            sub: 'none',
            msgstate: 0,
            transferReq: -1,
            trust: false,
            fingerprint: null,
            res: [],
            type: 'chat'
         }, data));

         return 'created';
      }
   };

   /**
    * @namespace jsxc.otr
    */
   jsxc.otr = {
      /** list of otr objects */
      objects: {},

      dsaFallback: null,
      /**
       * Handler for otr receive event
       * 
       * @memberOf jsxc.otr
       * @param {Object} d
       * @param {string} d.bid
       * @param {string} d.msg received message
       * @param {boolean} d.encrypted True, if msg was encrypted.
       * @param {boolean} d.forwarded
       * @param {string} d.stamp timestamp
       */
      receiveMessage: function(d) {
         var bid = d.bid;

         if (jsxc.otr.objects[bid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT) {
            jsxc.otr.backup(bid);
         }

         if (jsxc.otr.objects[bid].msgstate !== OTR.CONST.MSGSTATE_PLAINTEXT && !d.encrypted) {
            jsxc.gui.window.postMessage(bid, 'sys', jsxc.translate('%%Received an unencrypted message.%% [') + d.msg + ']', d.encrypted, d.forwarded, d.stamp);
         } else {
            jsxc.gui.window.postMessage(bid, 'in', d.msg, d.encrypted, d.forwarded, d.stamp);
         }
      },

      /**
       * Handler for otr send event
       * 
       * @param {string} jid
       * @param {string} msg message to be send
       */
      sendMessage: function(jid, msg, uid) {
         if (jsxc.otr.objects[jsxc.jidToBid(jid)].msgstate !== 0) {
            jsxc.otr.backup(jsxc.jidToBid(jid));
         }

         jsxc.xmpp._sendMessage(jid, msg, uid);
      },

      /**
       * Create new otr instance
       * 
       * @param {type} bid
       * @returns {undefined}
       */
      create: function(bid) {

         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            return;
         }

         if (!jsxc.options.otr.priv) {
            return;
         }

         // save list of otr objects
         var ol = jsxc.storage.getUserItem('otrlist') || [];
         if (ol.indexOf(bid) < 0) {
            ol.push(bid);
            jsxc.storage.setUserItem('otrlist', ol);
         }

         jsxc.otr.objects[bid] = new OTR(jsxc.options.otr);

         if (jsxc.options.otr.SEND_WHITESPACE_TAG) {
            jsxc.otr.objects[bid].SEND_WHITESPACE_TAG = true;
         }

         if (jsxc.options.otr.WHITESPACE_START_AKE) {
            jsxc.otr.objects[bid].WHITESPACE_START_AKE = true;
         }

         jsxc.otr.objects[bid].on('status', function(status) {
            var data = jsxc.storage.getUserItem('buddy', bid);

            if (data === null) {
               return;
            }

            switch (status) {
               case OTR.CONST.STATUS_SEND_QUERY:
                  jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.trying_to_start_private_conversation);
                  break;
               case OTR.CONST.STATUS_AKE_SUCCESS:
                  data.fingerprint = jsxc.otr.objects[bid].their_priv_pk.fingerprint();
                  data.msgstate = OTR.CONST.MSGSTATE_ENCRYPTED;

                  var msg = (jsxc.otr.objects[bid].trust ? jsxc.l.Verified : jsxc.l.Unverified) + ' ' + jsxc.l.private_conversation_started;
                  jsxc.gui.window.postMessage(bid, 'sys', msg);
                  break;
               case OTR.CONST.STATUS_END_OTR:
                  data.fingerprint = null;

                  if (jsxc.otr.objects[bid].msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
                     // we abort the private conversation

                     data.msgstate = OTR.CONST.MSGSTATE_PLAINTEXT;
                     jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.private_conversation_aborted);

                  } else {
                     // the buddy abort the private conversation

                     data.msgstate = OTR.CONST.MSGSTATE_FINISHED;
                     jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.your_buddy_closed_the_private_conversation_you_should_do_the_same);
                  }
                  break;
               case OTR.CONST.STATUS_SMP_HANDLE:
                  jsxc.keepBusyAlive();
                  break;
            }

            jsxc.storage.setUserItem('buddy', bid, data);

            // for encryption and verification state
            jsxc.gui.update(bid);
         });

         jsxc.otr.objects[bid].on('smp', function(type, data) {
            switch (type) {
               case 'question': // verification request received
                  jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.Authentication_request_received);

                  if ($('#jsxc_dialog').length > 0) {
                     jsxc.otr.objects[bid].sm.abort();
                     break;
                  }

                  jsxc.otr.onSmpQuestion(bid, data);
                  jsxc.storage.setUserItem('smp_' + bid, {
                     data: data || null
                  });

                  break;
               case 'trust': // verification completed
                  jsxc.otr.objects[bid].trust = data;
                  jsxc.storage.updateUserItem('buddy', bid, 'trust', data);
                  jsxc.otr.backup(bid);
                  jsxc.gui.update(bid);

                  if (data) {
                     jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.conversation_is_now_verified);
                  } else {
                     jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.authentication_failed);
                  }
                  jsxc.storage.removeUserItem('smp_' + bid);
                  jsxc.gui.dialog.close();
                  break;
               case 'abort':
                  jsxc.gui.window.postMessage(bid, 'sys', jsxc.l.Authentication_aborted);
                  break;
               default:
                  jsxc.debug('[OTR] sm callback: Unknown type: ' + type);
            }
         });

         // Receive message
         jsxc.otr.objects[bid].on('ui', function(msg, encrypted, meta) {
            jsxc.otr.receiveMessage({
               bid: bid,
               msg: msg,
               encrypted: encrypted === true,
               stamp: meta.stamp,
               forwarded: meta.forwarded
            });
         });

         // Send message
         jsxc.otr.objects[bid].on('io', function(msg, uid) {
            var jid = jsxc.gui.window.get(bid).data('jid') || jsxc.otr.objects[bid].jid;

            jsxc.otr.objects[bid].jid = jid;

            jsxc.otr.sendMessage(jid, msg, uid);
         });

         jsxc.otr.objects[bid].on('error', function(err) {
            // Handle this case in jsxc.otr.receiveMessage
            if (err !== 'Received an unencrypted message.') {
               jsxc.gui.window.postMessage(bid, 'sys', '[OTR] ' + jsxc.translate('%%' + err + '%%'));
            }

            jsxc.error('[OTR] ' + err);
         });

         jsxc.otr.restore(bid);
      },

      /**
       * show verification dialog with related part (secret or question)
       * 
       * @param {type} bid
       * @param {string} [data]
       * @returns {undefined}
       */
      onSmpQuestion: function(bid, data) {
         jsxc.gui.showVerification(bid);

         $('#jsxc_dialog select').prop('selectedIndex', (data ? 2 : 3)).change();
         $('#jsxc_dialog > div:eq(0)').hide();

         if (data) {
            $('#jsxc_dialog > div:eq(2)').find('#jsxc_quest').val(data).prop('disabled', true);
            $('#jsxc_dialog > div:eq(2)').find('.creation').text('Answer');
            $('#jsxc_dialog > div:eq(2)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_answer_and_click_answer);
         } else {
            $('#jsxc_dialog > div:eq(3)').find('.jsxc_explanation').text(jsxc.l.your_buddy_is_attempting_to_determine_ + ' ' + jsxc.l.to_authenticate_to_your_buddy + jsxc.l.enter_the_secret);
         }

         $('#jsxc_dialog .jsxc_close').click(function() {
            jsxc.storage.removeUserItem('smp_' + bid);

            if (jsxc.master) {
               jsxc.otr.objects[bid].sm.abort();
            }
         });
      },

      /**
       * Send verification request to buddy
       * 
       * @param {string} bid
       * @param {string} sec secret
       * @param {string} [quest] question
       * @returns {undefined}
       */
      sendSmpReq: function(bid, sec, quest) {
         jsxc.keepBusyAlive();

         jsxc.otr.objects[bid].smpSecret(sec, quest || '');
      },

      /**
       * Toggle encryption state
       * 
       * @param {type} bid
       * @returns {undefined}
       */
      toggleTransfer: function(bid) {
         if (jsxc.storage.getUserItem('buddy', bid).msgstate === 0) {
            jsxc.otr.goEncrypt(bid);
         } else {
            jsxc.otr.goPlain(bid);
         }
      },

      /**
       * Send request to encrypt the session
       * 
       * @param {type} bid
       * @returns {undefined}
       */
      goEncrypt: function(bid) {
         if (jsxc.master) {
            jsxc.otr.objects[bid].sendQueryMsg();
         } else {
            jsxc.storage.updateUserItem('buddy', bid, 'transferReq', 1);
         }
      },

      /**
       * Abort encryptet session
       * 
       * @param {type} bid
       * @param cb callback
       * @returns {undefined}
       */
      goPlain: function(bid, cb) {
         if (jsxc.master) {
            jsxc.otr.objects[bid].endOtr.call(jsxc.otr.objects[bid], cb);
            jsxc.otr.objects[bid].init.call(jsxc.otr.objects[bid]);

            jsxc.otr.backup(bid);
         } else {
            jsxc.storage.updateUserItem('buddy', bid, 'transferReq', 0);
         }
      },

      /**
       * Backups otr session
       * 
       * @param {string} bid
       */
      backup: function(bid) {
         var o = jsxc.otr.objects[bid]; // otr object
         var r = {}; // return value

         if (o === null) {
            return;
         }

         // all variables which should be saved
         var savekey = [ 'jid', 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval' ];

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

         jsxc.storage.setUserItem('otr', bid, r);
      },

      /**
       * Restore old otr session
       * 
       * @param {string} bid
       */
      restore: function(bid) {
         var o = jsxc.otr.objects[bid];
         var d = jsxc.storage.getUserItem('otr', bid);

         if (o !== null || d !== null) {
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

            jsxc.otr.objects[bid] = o;

            if (o.msgstate === 1 && o.their_priv_pk !== null) {
               o._smInit.call(jsxc.otr.objects[bid]);
            }
         }

         jsxc.otr.enable(bid);
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
            var msg = jsxc.l.Creating_your_private_key_;
            var worker = null;

            if (Worker) {
               // try to create web-worker

               try {
                  worker = new Worker(jsxc.options.root + '/lib/otr/build/dsa-webworker.js');
               } catch (err) {
                  jsxc.warn('Couldn\'t create web-worker.', err);
               }
            }

            jsxc.otr.dsaFallback = (worker === null);

            if (!jsxc.otr.dsaFallback) {
               // create DSA key in background

               jsxc._onMaster();

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

         if (jsxc.otr.dsaFallback !== false) {
            jsxc._onMaster();
         }
      },

      /**
       * Ending of DSA key generation.
       * 
       * @param {DSA} dsa DSA object
       */
      DSAready: function(dsa) {
         jsxc.storage.setUserItem('key', dsa.packPrivate());
         jsxc.options.otr.priv = dsa;

         // close wait alert
         if (jsxc.otr.dsaFallback) {
            jsxc.gui.dialog.close();
         } else {
            $.each(jsxc.storage.getUserItem('windowlist'), function(index, val) {
               jsxc.otr.create(val);
            });
         }

         jsxc.otr._createDSA();
      },

      enable: function(bid) {
         jsxc.gui.window.get(bid).find('.jsxc_otr').removeClass('jsxc_disabled');
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
         $(document).on('postmessagein.jsxc', function(event, bid, msg) {
            msg = (msg.match(/^\?OTR/)) ? jsxc.translate('%%Encrypted message%%') : msg;
            var data = jsxc.storage.getUserItem('buddy', bid);

            jsxc.notification.notify(jsxc.translate('%%New message from%% ') + data.name, msg, undefined, undefined, jsxc.CONST.SOUNDS.MSG);
         });

         $(document).on('callincoming.jingle', function() {
            jsxc.notification.playSound(jsxc.CONST.SOUNDS.CALL, true, true);
         });

         $(document).on('accept.call.jsxc reject.call.jsxc', function() {
            jsxc.notification.stopSound();
         });
      },

      /**
       * Shows a pop up notification and optional play sound.
       * 
       * @param title Title
       * @param msg Message
       * @param d Duration
       * @param force Should message also shown, if tab is visible?
       * @param soundFile Playing given sound file
       * @param loop Loop sound file?
       */
      notify: function(title, msg, d, force, soundFile, loop) {
         if (!jsxc.options.notification || !jsxc.notification.hasPermission()) {
            return; // notifications disabled
         }

         if (!jsxc.isHidden() && !force) {
            return; // Tab is visible
         }

         jsxc.toNotification = setTimeout(function() {

            if (typeof soundFile === 'string') {
               jsxc.notification.playSound(soundFile, loop, force);
            }

            var popup = new Notification(jsxc.translate(title), {
               body: jsxc.translate(msg),
               icon: jsxc.options.root + '/img/XMPP_logo.png'
            });

            var duration = d || jsxc.options.popupDuration;

            if (duration > 0) {
               setTimeout(function() {
                  popup.close();
               }, duration);
            }
         }, jsxc.toNotificationDelay);
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
               jsxc.notice.add('%%Notifications%%?', '%%Should_we_notify_you_%%', 'gui.showRequestNotification');
            }, 1000);
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

            jsxc.exec(fnName, fnParams);

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

            jsxc.notification.notify(msg, description || '', null, true, jsxc.CONST.SOUNDS.NOTICE);
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
         Logging_in: 'Logging in…',
         your_connection_is_unencrypted: 'Your connection is unencrypted.',
         your_connection_is_encrypted: 'Your connection is encrypted.',
         your_buddy_closed_the_private_connection: 'Your buddy closed the private connection.',
         start_private: 'Start private',
         close_private: 'Close private',
         your_buddy_is_verificated: 'Your buddy is verified.',
         you_have_only_a_subscription_in_one_way: 'You only have a one-way subscription.',
         authentication_query_sent: 'Authentication query sent.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Your message was not sent. Please end your private conversation.',
         unencrypted_message_received: 'Unencrypted message received:',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Your message was not sent because you have no valid subscription.',
         not_available: 'Not available',
         no_connection: 'No connection!',
         relogin: 'relogin',
         trying_to_start_private_conversation: 'Trying to start private conversation!',
         Verified: 'Verified',
         Unverified: 'Unverified',
         private_conversation_started: 'Private conversation started.',
         private_conversation_aborted: 'Private conversation aborted!',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Your buddy closed the private conversation! You should do the same.',
         conversation_is_now_verified: 'Conversation is now verified.',
         authentication_failed: 'Authentication failed.',
         your_buddy_is_attempting_to_determine_: 'You buddy is attempting to determine if he or she is really talking to you.',
         to_authenticate_to_your_buddy: 'To authenticate to your buddy, ',
         enter_the_answer_and_click_answer: 'enter the answer and click Answer.',
         enter_the_secret: 'enter the secret.',
         Creating_your_private_key_: 'Creating your private key; this may take a while.',
         Authenticating_a_buddy_helps_: 'Authenticating a buddy helps ensure that the person you are talking to is really the one he or she claims to be.',
         How_do_you_want_to_authenticate_your_buddy: 'How do you want to authenticate {{bid_name}} (<b>{{bid_jid}}</b>)?',
         Select_method: 'Select method...',
         Manual: 'Manual',
         Question: 'Question',
         Secret: 'Secret',
         To_verify_the_fingerprint_: 'To verify the fingerprint, contact your buddy via some other trustworthy channel, such as the telephone.',
         Your_fingerprint: 'Your fingerprint',
         Buddy_fingerprint: 'Buddy fingerprint',
         Close: 'Close',
         Compared: 'Compared',
         To_authenticate_using_a_question_: 'To authenticate using a question, pick a question whose answer is known only you and your buddy.',
         Ask: 'Ask',
         To_authenticate_pick_a_secret_: 'To authenticate, pick a secret known only to you and your buddy.',
         Compare: 'Compare',
         Fingerprints: 'Fingerprints',
         Authentication: 'Authentication',
         Message: 'Message',
         Add_buddy: 'Add buddy',
         rename_buddy: 'rename buddy',
         delete_buddy: 'delete buddy',
         Login: 'Login',
         Username: 'Username',
         Password: 'Password',
         Cancel: 'Cancel',
         Connect: 'Connect',
         Type_in_the_full_username_: 'Type in the full username and an optional alias.',
         Alias: 'Alias',
         Add: 'Add',
         Subscription_request: 'Subscription request',
         You_have_a_request_from: 'You have a request from',
         Deny: 'Deny',
         Approve: 'Approve',
         Remove_buddy: 'Remove buddy',
         You_are_about_to_remove_: 'You are about to remove {{bid_name}} (<b>{{bid_jid}}</b>) from your buddy list. All related chats will be closed.',
         Continue_without_chat: 'Continue without chat',
         Please_wait: 'Please wait',
         Login_failed: 'Chat login failed',
         Sorry_we_cant_authentikate_: 'Authentication failed with the chat server. Maybe the password is wrong?',
         Retry: 'Back',
         clear_history: 'Clear history',
         New_message_from: 'New message from',
         Should_we_notify_you_: 'Should we notify you about new messages in the future?',
         Please_accept_: 'Please click the "Allow" button at the top.',
         Hide_offline: 'Hide offline contacts',
         Show_offline: 'Show offline contacts',
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
         Not_one_of_our_latest_keys: 'Not one of our latest keys.',
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
         FN: 'Full name',
         N: ' ',
         FAMILY: 'Family name',
         GIVEN: 'Given name',
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
         TITLE: 'Job title',
         ROLE: 'Role',
         BDAY: 'Birthday',
         DESC: 'Description',
         PHOTO: ' ',
         send_message: 'Send message',
         get_info: 'Show information',
         Settings: 'Settings',
         Priority: 'Priority',
         Save: 'Save',
         User_settings: 'User settings',
         A_fingerprint_: 'A fingerprint is used to make sure that the person you are talking to is who he or she is saying.',
         Your_roster_is_empty_add_a: 'Your roster is empty, add a ',
         new_buddy: 'new buddy',
         is: 'is',
         Login_options: 'Login options',
         BOSH_url: 'BOSH URL',
         Domain: 'Domain',
         Resource: 'Resource',
         On_login: 'On login',
         Received_an_unencrypted_message: 'Received an unencrypted message',
         Sorry_your_buddy_doesnt_provide_any_information: 'Sorry, your buddy does not provide any information.',
         Info_about: 'Info about',
         Authentication_aborted: 'Authentication aborted.',
         Authentication_request_received: 'Authentication request received.',
         Do_you_want_to_display_them: 'Do you want to display them?',
         Log_in_without_chat: 'Log in without chat',
         has_come_online: 'has come online',
         Unknown_sender: 'Unknown sender',
         You_received_a_message_from_an_unknown_sender: 'You received a message from an unknown sender'
      },
      de: {
         Logging_in: 'Login läuft…',
         your_connection_is_unencrypted: 'Deine Verbindung ist UNverschlüsselt.',
         your_connection_is_encrypted: 'Deine Verbindung ist verschlüsselt.',
         your_buddy_closed_the_private_connection: 'Dein Freund hat die private Verbindung getrennt.',
         start_private: 'Privat starten',
         close_private: 'Privat abbrechen',
         your_buddy_is_verificated: 'Dein Freund ist verifiziert.',
         you_have_only_a_subscription_in_one_way: 'Die Freundschaft ist nur einseitig.',
         authentication_query_sent: 'Authentifizierungsanfrage gesendet.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Deine Nachricht wurde nicht gesendet. Bitte beende die private Konversation.',
         unencrypted_message_received: 'Unverschlüsselte Nachricht erhalten.',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Deine Nachricht wurde nicht gesandt, da die Freundschaft einseitig ist.',
         not_available: 'Nicht verfügbar.',
         no_connection: 'Keine Verbindung.',
         relogin: 'Neu anmelden.',
         trying_to_start_private_conversation: 'Versuche private Konversation zu starten.',
         Verified: 'Verifiziert',
         Unverified: 'Unverifiziert',
         private_conversation_started: 'Private Konversation gestartet.',
         private_conversation_aborted: 'Private Konversation abgebrochen.',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Dein Freund hat die private Konversation beendet. Das solltest du auch tun!',
         conversation_is_now_verified: 'Konversation ist jetzt verifiziert',
         authentication_failed: 'Authentifizierung fehlgeschlagen.',
         your_buddy_is_attempting_to_determine_: 'Dein Freund versucht herauszufinden ob er wirklich mit dir redet.',
         to_authenticate_to_your_buddy: 'Um dich gegenüber deinem Freund zu verifizieren ',
         enter_the_answer_and_click_answer: 'gib die Antwort ein und klick auf Antworten.',
         enter_the_secret: 'gib das Geheimnis ein.',
         Creating_your_private_key_: 'Wir werden jetzt deinen privaten Schlüssel generieren. Das kann einige Zeit in Anspruch nehmen.',
         Authenticating_a_buddy_helps_: 'Einen Freund zu authentifizieren hilft sicher zustellen, dass die Person mit der du sprichst auch die ist die sie sagt.',
         How_do_you_want_to_authenticate_your_buddy: 'Wie willst du {{bid_name}} (<b>{{bid_jid}}</b>) authentifizieren?',
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
         Authentication: 'Authentifizierung',
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
         You_are_about_to_remove_: 'Du bist gerade dabei {{bid_name}} (<b>{{bid_jid}}</b>) von deiner Kontaktliste zu entfernen. Alle Chats werden geschlossen.',
         Continue_without_chat: 'Weiter ohne Chat',
         Please_wait: 'Bitte warten',
         Login_failed: 'Chat-Anmeldung fehlgeschlagen',
         Sorry_we_cant_authentikate_: 'Der Chatserver hat die Anmeldung abgelehnt. Falsches Passwort?',
         Retry: 'Zurück',
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
         Not_one_of_our_latest_keys: 'Nicht einer unserer letzten Schlüssel.',
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
         FN: 'Name',
         N: ' ',
         FAMILY: 'Familienname',
         GIVEN: 'Vorname',
         NICKNAME: 'Spitzname',
         URL: 'URL',
         ADR: 'Adresse',
         STREET: 'Straße',
         EXTADD: 'Zusätzliche Adresse',
         LOCALITY: 'Ortschaft',
         REGION: 'Region',
         PCODE: 'Postleitzahl',
         CTRY: 'Land',
         TEL: 'Telefon',
         NUMBER: 'Nummer',
         EMAIL: 'E-Mail',
         USERID: ' ',
         ORG: 'Organisation',
         ORGNAME: 'Name',
         ORGUNIT: 'Abteilung',
         TITLE: 'Titel',
         ROLE: 'Rolle',
         BDAY: 'Geburtstag',
         DESC: 'Beschreibung',
         PHOTO: ' ',
         send_message: 'Sende Nachricht',
         get_info: 'Benutzerinformationen',
         Settings: 'Einstellungen',
         Priority: 'Priorität',
         Save: 'Speichern',
         User_settings: 'Benutzereinstellungen',
         A_fingerprint_: 'Ein Fingerabdruck wird dazu benutzt deinen Gesprächspartner zu identifizieren.',
         Your_roster_is_empty_add_a: 'Deine Freundesliste ist leer, füge einen neuen Freund ',
         new_buddy: 'hinzu',
         is: 'ist',
         Login_options: 'Anmeldeoptionen',
         BOSH_url: 'BOSH url',
         Domain: 'Domain',
         Resource: 'Ressource',
         On_login: 'Beim Anmelden',
         Received_an_unencrypted_message: 'Unverschlüsselte Nachricht empfangen',
         Sorry_your_buddy_doesnt_provide_any_information: 'Dein Freund stellt leider keine Informationen bereit.',
         Info_about: 'Info über',
         Authentication_aborted: 'Authentifizierung abgebrochen.',
         Authentication_request_received: 'Authentifizierunganfrage empfangen.',
         Log_in_without_chat: 'Anmelden ohne Chat',
         Do_you_want_to_display_them: 'Möchtest du sie sehen?',
         has_come_online: 'ist online gekommen',
         Unknown_sender: 'Unbekannter Sender',
         You_received_a_message_from_an_unknown_sender: 'Du hast eine Nachricht von einem unbekannten Sender erhalten'
      },
      es: {
         Logging_in: 'Por favor, espere...',
         your_connection_is_unencrypted: 'Su conexión no está cifrada.',
         your_connection_is_encrypted: 'Su conexión está cifrada.',
         your_buddy_closed_the_private_connection: 'Su amigo ha cerrado la conexión privada.',
         start_private: 'Iniciar privado',
         close_private: 'Cerrar privado',
         your_buddy_is_verificated: 'Tu amigo está verificado.',
         you_have_only_a_subscription_in_one_way: 'Sólo tienes una suscripción de un modo.',
         authentication_query_sent: 'Consulta de verificación enviada.',
         your_message_wasnt_send_please_end_your_private_conversation: 'Su mensaje no fue enviado. Por favor, termine su conversación privada.',
         unencrypted_message_received: 'Mensaje no cifrado recibido:',
         your_message_wasnt_send_because_you_have_no_valid_subscription: 'Su mensaje no se ha enviado, porque usted no tiene suscripción válida.',
         not_available: 'No disponible',
         no_connection: 'Sin conexión!',
         relogin: 'iniciar sesión nuevamente',
         trying_to_start_private_conversation: 'Intentando iniciar una conversación privada!',
         Verified: 'Verificado',
         Unverified: 'No verificado',
         private_conversation_started: 'se inició una conversación privada.',
         private_conversation_aborted: 'Conversación privada abortada!',
         your_buddy_closed_the_private_conversation_you_should_do_the_same: 'Su amigo cerró la conversación privada! Usted debería hacer lo mismo.',
         conversation_is_now_verified: 'La conversación es ahora verificada.',
         authentication_failed: 'Fallo la verificación.',
         your_buddy_is_attempting_to_determine_: 'Tu amigo está tratando de determinar si él o ella está realmente hablando con usted.',
         to_authenticate_to_your_buddy: 'Para autenticar a su amigo, ',
         enter_the_answer_and_click_answer: 'introduce la respuesta y haga clic en Contestar.',
         enter_the_secret: 'especifique el secreto.',
         Creating_your_private_key_: 'Ahora vamos a crear su clave privada. Esto puede tomar algún tiempo.',
         Authenticating_a_buddy_helps_: 'Autenticación de un amigo ayuda a garantizar que la persona que está hablando es quien él o ella está diciendo.',
         How_do_you_want_to_authenticate_your_buddy: '¿Cómo desea autenticar {{bid_name}} (<b>{{bid_jid}}</b>)?',
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
         Authentication: 'Autenticación',
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
         You_are_about_to_remove_: 'Vas a eliminar a {{bid_name}} (<b>{{bid_jid}}</b>) de tu lista de amigos. Todas las conversaciones relacionadas serán cerradas.',
         Continue_without_chat: 'Continuar',
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
         Not_one_of_our_latest_keys: 'No de nuestra ultima tecla.',
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
         FN: 'Nombre completo ',
         N: ' ',
         FAMILY: 'Apellido',
         GIVEN: 'Nombre',
         NICKNAME: 'Apodar',
         URL: 'URL',
         ADR: 'Dirección',
         STREET: 'Calle',
         EXTADD: 'Extendido dirección',
         LOCALITY: 'Población',
         REGION: 'Región',
         PCODE: 'Código postal',
         CTRY: 'País',
         TEL: 'Teléfono',
         NUMBER: 'Número',
         EMAIL: 'Emilio',
         USERID: ' ',
         ORG: 'Organización',
         ORGNAME: 'Nombre',
         ORGUNIT: 'Departamento',
         TITLE: 'Título',
         ROLE: 'Rol',
         BDAY: 'Cumpleaños',
         DESC: 'Descripción',
         PHOTO: ' ',
         send_message: 'mandar un texto',
         get_info: 'obtener información',
         Settings: 'Ajustes',
         Priority: 'Prioridad',
         Save: 'Guardar',
         User_settings: 'Configuración de usuario',
         A_fingerprint_: 'La huella digital se utiliza para que puedas estar seguro que la persona con la que estas hablando es quien realmente dice ser',
         Your_roster_is_empty_add_a: 'Tu lista de amigos esta vacia',
         new_buddy: 'Nuevo amigo',
         is: 'es',
         Login_options: 'Opciones de login',
         BOSH_url: 'BOSH url',
         Domain: 'Dominio',
         Resource: 'Recurso',
         On_login: 'Iniciar sesión',
         Received_an_unencrypted_message: 'Recibe un mensaje no cifrado'
      }
   };
}(jQuery));
