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

   /** True if last activity was up to 10 min ago */
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
      STATUS: ['offline', 'dnd', 'xa', 'away', 'chat', 'online'],
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
      var dateNow = new Date(),
         time = hours + ':' + minutes;

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

      // Check localStorage
      if (typeof(localStorage) === 'undefined') {
         jsxc.warn("Browser doesn't support localStorage.");
         return;
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

      // initialize i18n translator
      $.i18n.init({
         lng: lang,
         fallbackLng: 'en',
         resStore: I18next,
         // use localStorage and set expiration to a day
         useLocalStorage: true,
         localStorageExpirationTime: 60 * 60 * 24 * 1000,
      });

      if (jsxc.storage.getItem('debug') === true) {
         jsxc.options.otr.debug = true;
      }

      // Register event listener for the storage event
      window.addEventListener('storage', jsxc.storage.onStorage, false);

      var lastActivity = jsxc.storage.getItem('lastActivity') || 0;

      if ((new Date()).getTime() - lastActivity < jsxc.options.loginTimeout) {
         jsxc.restore = true;
      }

      $(document).on('connectionReady.jsxc', function() {
         // Looking for logout element
         if (jsxc.options.logoutElement !== null && jsxc.options.logoutElement.length > 0) {
            var logout = function() {
               jsxc.options.logoutElement = $(this);
               jsxc.triggeredFromLogout = true;
               return jsxc.xmpp.logout();
            };

            jsxc.options.logoutElement.off('click', null, logout).one('click', logout);
         }
      });

      // Check if we have to establish a new connection
      if (!jsxc.storage.getItem('rid') || !jsxc.storage.getItem('sid') || !jsxc.restore) {

         // clean up rid and sid
         jsxc.storage.removeItem('rid');
         jsxc.storage.removeItem('sid');

         // Looking for a login form
         if (!jsxc.isLoginForm()) {

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
            jsxc.prepareLogin(function(settings) {
               if (settings !== false) {
                  // settings.xmpp.onlogin is deprecated since v2.1.0
                  var enabled = (settings.loginForm && settings.loginForm.enable) || (settings.xmpp && settings.xmpp.onlogin);
                  enabled = enabled === "true" || enabled === true;

                  if (enabled) {
                     jsxc.options.loginForm.triggered = true;

                     jsxc.xmpp.login();
                  }
               } else {
                  jsxc.submitLoginForm();
               }
            });

            // Trigger submit in jsxc.xmpp.connected()
            return false;
         });

      } else if (!jsxc.isLoginForm() || (jsxc.options.loginForm && jsxc.options.loginForm.attachIfFound)) {

         // Restore old connection

         jsxc.bid = jsxc.jidToBid(jsxc.storage.getItem('jid'));

         jsxc.gui.init();

         if (typeof(jsxc.storage.getItem('alive')) === 'undefined' || !jsxc.restore) {
            jsxc.onMaster();
         } else {
            jsxc.checkMaster();
         }
      }
   },

   /**
    * Returns true if login form is found.
    *
    * @memberOf jsxc
    * @returns {boolean} True if login form was found.
    */
   isLoginForm: function() {
      return jsxc.options.loginForm.form && jsxc.el_exists(jsxc.options.loginForm.form) && jsxc.el_exists(jsxc.options.loginForm.jid) && jsxc.el_exists(jsxc.options.loginForm.pass);
   },

   /**
    * Load settings and prepare jid.
    * 
    * @memberOf jsxc
    * @param {string} username
    * @param {string} password
    * @param {function} cb Called after login is prepared with result as param
    */
   prepareLogin: function(username, password, cb) {
      if (typeof username === 'function') {
         cb = username;
         username = null;
      }
      username = username || $(jsxc.options.loginForm.jid).val();
      password = password || $(jsxc.options.loginForm.pass).val();

      if (!jsxc.triggeredFromBox && (jsxc.options.loginForm.onConnecting === 'dialog' || typeof jsxc.options.loginForm.onConnecting === 'undefined')) {
         jsxc.gui.showWaitAlert($.t('Logging_in'));
      }

      var settings;

      if (typeof jsxc.options.loadSettings === 'function') {
         settings = jsxc.options.loadSettings.call(this, username, password, function(s) {
            jsxc._prepareLogin(username, password, cb, s);
         });

         if (typeof settings !== 'undefined') {
            jsxc._prepareLogin(username, password, cb, settings);
         }
      } else {
         jsxc._prepareLogin(username, password, cb);
      }
   },

   /**
    * Process xmpp settings and save loaded settings.
    * 
    * @private
    * @memberOf jsxc
    * @param {string} username
    * @param {string} password
    * @param {function} cb Called after login is prepared with result as param
    * @param {object} [loadedSettings] additonal options
    */
   _prepareLogin: function(username, password, cb, loadedSettings) {
      if (loadedSettings === false) {
         jsxc.warn('No settings provided');

         cb(false);
         return;
      }

      // prevent to modify the original object
      var settings = $.extend(true, {}, jsxc.options);

      if (loadedSettings) {
         // overwrite current options with loaded settings;
         settings = $.extend(true, settings, loadedSettings);
      } else {
         loadedSettings = {};
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

      if (!loadedSettings.xmpp) {
         // force xmpp settings to be saved to storage
         loadedSettings.xmpp = {};
      }

      // save loaded settings to storage
      $.each(loadedSettings, function(key) {
         var old = jsxc.options.get(key);
         var val = settings[key];
         val = $.extend(true, old, val);

         jsxc.options.set(key, val);
      });

      jsxc.options.xmpp.jid = jid;
      jsxc.options.xmpp.password = password;

      cb(settings);
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
         var noti = jsxc.storage.getUserItem('notification');
         noti = (typeof noti === 'number') ? noti : 2;
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
         jsxc.gui.updateAvatar($('#jsxc_avatar'), jsxc.jidToBid(jsxc.storage.getItem('jid')), 'own');
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
      return Strophe.unescapeNode(Strophe.getBareJidFromJid(jid).toLowerCase());
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

      jsxc.gui.roster.loaded = true;
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
    * Checks if tab has focus.
    *
    * @returns {boolean} True if tabs has focus
    */
   hasFocus: function() {
      var focus = true;

      if (typeof document.hasFocus === 'function') {
         focus = document.hasFocus();
      }

      if (!focus && jsxc.master) {
         jsxc.storage.ink('focus', 0);
      } else if (focus && !jsxc.master) {
         jsxc.storage.ink('focus');
      }

      return focus;
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
   },

   /**
    * Hash string into 32-bit signed integer.
    * 
    * @memberOf jsxc
    * @param {string} str input string
    * @returns {integer} 32-bit signed integer
    */
   hashStr: function(str) {
      var hash = 0,
         i;

      if (str.length === 0) {
         return hash;
      }

      for (i = 0; i < str.length; i++) {
         hash = ((hash << 5) - hash) + str.charCodeAt(i);
         hash |= 0; // Convert to 32bit integer
      }

      return hash;
   },

   isExtraSmallDevice: function() {
      return $(window).width() < 500;
   }
};
