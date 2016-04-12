/*!
 * jsxc v3.0.0 - 2016-03-11
 * 
 * Copyright (c) 2016 Klaus Herberth <klaus@jsxc.org> <br>
 * Released under the MIT license
 * 
 * Please see http://www.jsxc.org/
 * 
 * @author Klaus Herberth <klaus@jsxc.org>
 * @version 3.0.0
 * @license MIT
 */

/*! This file is concatenated for the browser. */

var jsxc = null, RTC = null, RTCPeerconnection = null;

(function($) {
   "use strict";

/**
 * JavaScript Xmpp Chat namespace
 * 
 * @namespace jsxc
 */
jsxc = {
   /** Version of jsxc */
   version: '3.0.0',

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

   /** True if jid, sid and rid was used to connect */
   reconnect: false,

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
         URL: new RegExp(/(https?:\/\/|www\.)[^\s<>'"]+/gi)
      },
      NS: {
         CARBONS: 'urn:xmpp:carbons:2',
         FORWARD: 'urn:xmpp:forward:0'
      },
      HIDDEN: 'hidden',
      SHOWN: 'shown'
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
      var day = ('0' + msgDate.getDate()).slice(-2);
      var month = ('0' + (msgDate.getMonth() + 1)).slice(-2);
      var year = msgDate.getFullYear();
      var hours = ('0' + msgDate.getHours()).slice(-2);
      var minutes = ('0' + msgDate.getMinutes()).slice(-2);
      var dateNow = new Date();

      var date = (typeof msgDate.toLocaleDateString === 'function') ? msgDate.toLocaleDateString() : day + '.' + month + '.' + year;
      var time = (typeof msgDate.toLocaleTimeString === 'function') ? msgDate.toLocaleTimeString() : hours + ':' + minutes;

      // compare dates only
      dateNow.setHours(0, 0, 0, 0);
      msgDate.setHours(0, 0, 0, 0);

      if (dateNow.getTime() !== msgDate.getTime()) {
         return date + ' ' + time;
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

         jsxc.log = jsxc.log + '$ ' + msg + ': ' + d + '\n';
      } else {
         console.log(msg);
         jsxc.log = jsxc.log + '$ ' + msg + '\n';
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

      if (options && options.loginForm && typeof options.loginForm.attachIfFound === 'boolean' && !options.loginForm.ifFound) {
         // translate deprated option attachIfFound found to new ifFound
         options.loginForm.ifFound = (options.loginForm.attachIfFound) ? 'attach' : 'pause';
      }

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
         if (jsxc.bid) {
            var local = jsxc.storage.getUserItem('options') || {};

            return local[key] || jsxc.options[key];
         }

         return jsxc.options[key];
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
         debug: jsxc.storage.getItem('debug') === true
      });

      if (jsxc.storage.getItem('debug') === true) {
         jsxc.options.otr.debug = true;
      }

      // Register event listener for the storage event
      window.addEventListener('storage', jsxc.storage.onStorage, false);

      $(document).on('attached.jsxc', function() {
         // Looking for logout element
         if (jsxc.options.logoutElement !== null && jsxc.options.logoutElement.length > 0) {
            var logout = function(ev) {
               if (!jsxc.xmpp.conn || !jsxc.xmpp.conn.authenticated) {
                  return;
               }

               ev.stopPropagation();
               ev.preventDefault();

               jsxc.options.logoutElement = $(this);
               jsxc.triggeredFromLogout = true;

               jsxc.xmpp.logout();
            };

            jsxc.options.logoutElement.off('click', null, logout).one('click', logout);
         }
      });

      // Check if we have to establish a new connection
      if (!(jsxc.storage.getItem('rid') && jsxc.storage.getItem('sid') && jsxc.storage.getItem('jid')) || (jsxc.options.loginForm && jsxc.options.loginForm.ifFound === 'force' && jsxc.isLoginForm())) {

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

                     jsxc.xmpp.login(jsxc.options.xmpp.jid, jsxc.options.xmpp.password);
                  }
               } else {
                  jsxc.submitLoginForm();
               }
            });

            // Trigger submit in jsxc.xmpp.connected()
            return false;
         });

      } else if (!jsxc.isLoginForm() || (jsxc.options.loginForm && jsxc.options.loginForm.ifFound === 'attach')) {

         // Restore old connection

         if (typeof(jsxc.storage.getItem('alive')) === 'undefined') {
            jsxc.onMaster();
         } else {
            jsxc.checkMaster();
         }
      }
   },

   /**
    * Attach to previous session if jid, sid and rid are available in storage 
    * (default behaviour also for {@link jsxc.init}). Otherwise try to start new session 
    * with given jid and password in jsxc.options.xmpp.
    *
    * @memberOf jsxc
    */
   /**
    * Start new chat session with given jid and password.
    *
    * @memberOf jsxc
    * @param {string} jid Jabber Id
    */
   /**
    * Attach to new chat session with jid, sid and rid.
    *
    * @memberOf jsxc
    * @param {string} jid Jabber Id
    * @param {string} sid Session Id
    * @param {string} rid Request Id
    */
   start: function() {
      if (jsxc.role_allocation && !jsxc.master) {
         jsxc.debug('There is an other master tab');

         return false;
      }

      if (jsxc.xmpp.conn && jsxc.xmpp.connected) {
         jsxc.debug('We are already connected');

         return false;
      }

      if (arguments.length === 3) {
         $(document).one('attached.jsxc', function() {
            // save rid after first attachment
            jsxc.xmpp.onRidChange(jsxc.xmpp.conn._proto.rid);

            jsxc.onMaster();
         });
      }

      jsxc.xmpp.login.apply(this, arguments);
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
      jsxc.bid = jsxc.jidToBid(jsxc.storage.getItem('jid'));

      jsxc.gui.init();

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

      // Sending keepalive signal
      jsxc.startKeepAlive();

      jsxc.role_allocation = true;

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

   masterActions: function() {

      if (!jsxc.xmpp.conn || !jsxc.xmpp.conn.authenticated) {
         return;
      }

      //prepare notifications
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

      if (jsxc.options.get('otr').enable) {
         // create or load DSA key
         jsxc.otr.createDSA();
      }

      jsxc.gui.updateAvatar($('#jsxc_roster > .jsxc_bottom'), jsxc.jidToBid(jsxc.storage.getItem('jid')), 'own');
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
         var win = jsxc.storage.getUserItem('window', bid);

         if (!win) {
            jsxc.debug('Associated window-element is missing: ' + bid);
            return true;
         }

         jsxc.gui.window.init(bid);

         if (!win.minimize) {
            jsxc.gui.window.show(bid);
         } else {
            jsxc.gui.window.hide(bid);
         }

         jsxc.gui.window.setText(bid, win.text);
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

      if (jsxc.xmpp.conn && jsxc.xmpp.conn.authenticated) {
         return;
      }

      var jid = null,
         password = null,
         sid = null,
         rid = null;

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
            sid = jsxc.storage.getItem('sid');
            rid = jsxc.storage.getItem('rid');

            if (sid !== null && rid !== null) {
               jid = jsxc.storage.getItem('jid');
            } else {
               sid = null;
               rid = null;
               jid = jsxc.options.xmpp.jid;
            }
      }

      if (!jid) {
         jsxc.warn('Jid required for login');

         return;
      }

      if (!jsxc.bid) {
         jsxc.bid = jsxc.jidToBid(jid);
      }

      var url = jsxc.options.get('xmpp').url;

      if (!url) {
         jsxc.warn('xmpp.url required for login');

         return;
      }

      if (!(jsxc.xmpp.conn && jsxc.xmpp.conn.connected)) {
         // Register eventlistener
         $(document).on('connected.jsxc', jsxc.xmpp.connected);
         $(document).on('attached.jsxc', jsxc.xmpp.attached);
         $(document).on('disconnected.jsxc', jsxc.xmpp.disconnected);
         $(document).on('connfail.jsxc', jsxc.xmpp.onConnfail);
         $(document).on('authfail.jsxc', jsxc.xmpp.onAuthFail);

         Strophe.addNamespace('RECEIPTS', 'urn:xmpp:receipts');
      }

      // Create new connection (no login)
      jsxc.xmpp.conn = new Strophe.Connection(url);

      if (jsxc.storage.getItem('debug') === true) {
         jsxc.xmpp.conn.xmlInput = function(data) {
            console.log('<', data);
         };
         jsxc.xmpp.conn.xmlOutput = function(data) {
            console.log('>', data);
         };
      }

      jsxc.xmpp.conn.nextValidRid = jsxc.xmpp.onRidChange;

      var callback = function(status, condition) {

         jsxc.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

         switch (status) {
            case Strophe.Status.CONNECTING:
               $(document).trigger('connecting.jsxc');
               break;
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

      if (sid && rid) {
         jsxc.debug('Try to attach');
         jsxc.debug('SID: ' + sid);

         jsxc.reconnect = true;

         jsxc.xmpp.conn.attach(jid, sid, rid, callback);
      } else {
         jsxc.debug('New connection');

         if (jsxc.xmpp.conn.caps) {
            // Add system handler, because user handler isn't called before
            // we are authenticated
            jsxc.xmpp.conn._addSysHandler(function(stanza) {
               var from = jsxc.xmpp.conn.domain,
                  c = stanza.querySelector('c'),
                  ver = c.getAttribute('ver'),
                  node = c.getAttribute('node');

               var _jidNodeIndex = JSON.parse(localStorage.getItem('strophe.caps._jidNodeIndex')) || {};

               jsxc.xmpp.conn.caps._jidVerIndex[from] = ver;
               _jidNodeIndex[from] = node;

               localStorage.setItem('strophe.caps._jidVerIndex', JSON.stringify(jsxc.xmpp.conn.caps._jidVerIndex));
               localStorage.setItem('strophe.caps._jidNodeIndex', JSON.stringify(_jidNodeIndex));
            }, Strophe.NS.CAPS);
         }

         jsxc.xmpp.conn.connect(jid, password || jsxc.options.xmpp.password, callback);
      }
   },

   /**
    * Logs user out of his xmpp session and does some clean up.
    * 
    * @param {boolean} complete If set to false, roster will not be removed
    * @returns {Boolean}
    */
   logout: function(complete) {

      // instruct all tabs
      jsxc.storage.removeItem('sid');

      // clean up
      jsxc.storage.removeUserItem('buddylist');
      jsxc.storage.removeUserItem('windowlist');
      jsxc.storage.removeUserItem('unreadMsg');

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

      jsxc.triggeredFromElement = (typeof complete === 'boolean') ? complete : true;

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

      jsxc.xmpp.initNewConnection();

      jsxc.xmpp.saveSessionParameter();

      if (jsxc.options.loginForm.triggered) {
         switch (jsxc.options.loginForm.onConnected || 'submit') {
            case 'submit':
               jsxc.submitLoginForm();
               return;
            case false:
               return;
         }
      }

      // start chat

      jsxc.gui.dialog.close();

      jsxc.xmpp.conn.resume();
      jsxc.onMaster();

      $(document).trigger('attached.jsxc');
   },

   /**
    * Triggered if connection is attached
    * 
    * @private
    */
   attached: function() {

      $('#jsxc_roster').removeClass('jsxc_noConnection');

      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onRosterChanged, 'jabber:iq:roster', 'iq', 'set');
      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onMessage, null, 'message', 'chat');
      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onReceived, null, 'message');
      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onPresence, null, 'presence');

      jsxc.gui.init();

      var caps = jsxc.xmpp.conn.caps;
      var domain = jsxc.xmpp.conn.domain;

      if (caps) {
         var conditionalEnable = function() {};

         if (jsxc.options.get('carbons').enable) {
            conditionalEnable = function() {
               if (jsxc.xmpp.conn.caps.hasFeatureByJid(domain, jsxc.CONST.NS.CARBONS)) {
                  jsxc.xmpp.carbons.enable();
               }
            };

            $(document).on('caps.strophe', function onCaps(ev, from) {

               if (from !== domain) {
                  return;
               }

               conditionalEnable();

               $(document).off('caps.strophe', onCaps);
            });
         }

         if (typeof caps._knownCapabilities[caps._jidVerIndex[domain]] === 'undefined') {
            var _jidNodeIndex = JSON.parse(localStorage.getItem('strophe.caps._jidNodeIndex')) || {};

            jsxc.debug('Request server capabilities');

            caps._requestCapabilities(jsxc.xmpp.conn.domain, _jidNodeIndex[domain], caps._jidVerIndex[domain]);
         } else {
            // We know server caps
            conditionalEnable();
         }
      }

      // Only load roaster if necessary
      if (!jsxc.reconnect || !jsxc.storage.getUserItem('buddylist')) {
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

         if (!jsxc.restoreCompleted) {
            jsxc.restoreRoster();
            jsxc.restoreWindows();
            jsxc.restoreCompleted = true;

            $(document).trigger('restoreCompleted.jsxc');
         }
      }

      jsxc.xmpp.saveSessionParameter();

      jsxc.masterActions();
   },

   saveSessionParameter: function() {

      var nomJid = Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid).toLowerCase() + '/' + Strophe.getResourceFromJid(jsxc.xmpp.conn.jid);

      // Save sid and jid
      jsxc.storage.setItem('sid', jsxc.xmpp.conn._proto.sid);
      jsxc.storage.setItem('jid', nomJid);
   },

   initNewConnection: function() {
      // make shure roster will be reloaded
      jsxc.storage.removeUserItem('buddylist');

      jsxc.storage.removeUserItem('windowlist');
      jsxc.storage.removeUserItem('own');
      jsxc.storage.removeUserItem('avatar', 'own');
      jsxc.storage.removeUserItem('otrlist');
      jsxc.storage.removeUserItem('unreadMsg');

      // reset user options
      jsxc.storage.removeUserElement('options', 'RTCPeerConfig');
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

      jsxc.storage.removeItem('jid');
      jsxc.storage.removeItem('sid');
      jsxc.storage.removeItem('rid');
      jsxc.storage.removeItem('hidden');
      jsxc.storage.removeUserItem('avatar', 'own');
      jsxc.storage.removeUserItem('otrlist');

      $(document).off('connected.jsxc', jsxc.xmpp.connected);
      $(document).off('attached.jsxc', jsxc.xmpp.attached);
      $(document).off('disconnected.jsxc', jsxc.xmpp.disconnected);
      $(document).off('connfail.jsxc', jsxc.xmpp.onConnfail);
      $(document).off('authfail.jsxc', jsxc.xmpp.onAuthFail);

      jsxc.xmpp.conn = null;

      $('#jsxc_windowList').remove();

      if (jsxc.triggeredFromElement) {
         $(document).trigger('toggle.roster.jsxc', ['hidden', 0]);
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
            case 'quiet':
            case false:
               return;
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

      // load bookmarks
      jsxc.xmpp.bookmarks.load();

      jsxc.gui.roster.loaded = true;
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
            var noticeKey = null,
               notice;

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
       * xmlns='http://jabber.org/protocol/caps' node='http://psi-im.org/caps'
       * ver='caps-b75d8d2b25' ext='ca cs ep-notify-2 html'/> </presence>
       */
      jsxc.debug('onPresence', presence);

      var ptype = $(presence).attr('type');
      var from = $(presence).attr('from');
      var jid = Strophe.getBareJidFromJid(from).toLowerCase();
      var r = Strophe.getResourceFromJid(from);
      var bid = jsxc.jidToBid(jid);
      var data = jsxc.storage.getUserItem('buddy', bid) || {};
      var res = jsxc.storage.getUserItem('res', bid) || {};
      var status = null;
      var xVCard = $(presence).find('x[xmlns="vcard-temp:x:update"]');

      if (jid === Strophe.getBareJidFromJid(jsxc.storage.getItem("jid"))) {
         return true;
      }

      if (ptype === 'error') {
         $(document).trigger('error.presence.jsxc', [from, presence]);

         var error = $(presence).find('error');

         //TODO display error message
         jsxc.error('[XMPP] ' + error.attr('code') + ' ' + error.find(">:first-child").prop('tagName'));
         return true;
      }

      // incoming friendship request
      if (ptype === 'subscribe') {
         var bl = jsxc.storage.getUserItem('buddylist');

         if (bl.indexOf(bid) > -1) {
            jsxc.debug('Auto approve contact request, because he is already in our contact list.');

            jsxc.xmpp.resFriendReq(jid, true);
            if (data.sub !== 'to') {
               jsxc.xmpp.addBuddy(jid, data.name);
            }

            return true;
         }

         jsxc.storage.setUserItem('friendReq', {
            jid: jid,
            approve: -1
         });
         jsxc.notice.add($.t('Friendship_request'), $.t('from') + ' ' + jid, 'gui.showApproveDialog', [jid]);

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
      var max = 0,
         prop = null;
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
         jsxc.notification.notify({
            title: data.name,
            msg: $.t('has_come_online'),
            source: bid
         });
      }

      if (data.type === 'groupchat') {
         data.status = status;
      } else {
         data.status = max;
      }

      data.res = maxVal;
      data.jid = jid;

      // Looking for avatar
      if (xVCard.length > 0 && data.type !== 'groupchat') {
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

      $(document).trigger('presence.jsxc', [from, status, presence]);

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
         var direction = (carbon.prop("tagName") === 'sent') ? jsxc.Message.OUT : jsxc.Message.IN;
         bid = jsxc.jidToBid((direction === 'out') ? $(message).attr('to') : from);

         jsxc.gui.window.postMessage({
            bid: bid,
            direction: direction,
            msg: body,
            encrypted: false,
            forwarded: forwarded,
            stamp: stamp
         });

         return true;

      } else if (forwarded) {
         // Someone forwarded a message to us

         body = from + ' ' + $.t('to') + ' ' + $(stanza).attr('to') + '"' + body + '"';

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
            jsxc.notice.add($.t('Unknown_sender'), $.t('You_received_a_message_from_an_unknown_sender') + ' (' + bid + ').', 'gui.showUnknownSender', [bid]);
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

      $(document).trigger('message.jsxc', [from, body]);

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
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.IN,
            msg: body,
            encrypted: false,
            forwarded: forwarded,
            stamp: stamp
         });
      }

      // preserve handler
      return true;
   },

   /**
    * Triggerd if the rid changed
    * 
    * @param {integer} rid next valid request id
    * @private
    */
   onRidChange: function(rid) {
      jsxc.storage.setItem('rid', rid);
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

   onReceived: function(stanza) {
      var received = $(stanza).find("received[xmlns='urn:xmpp:receipts']");

      if (received.length) {
         var receivedId = received.attr('id');
         var message = new jsxc.Message(receivedId);

         message.received();
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
   },

   /**
    * Test if jid has given features
    * 
    * @param  {string}   jid     Jabber id
    * @param  {string[]} feature Single feature or list of features
    * @param  {Function} cb      Called with the result as first param.
    * @return {boolean}          True, if jid has all given features. Null, if we do not know it currently.
    */
   hasFeatureByJid: function(jid, feature, cb) {
      var conn = jsxc.xmpp.conn;
      cb = cb || function() {};

      if (!feature) {
         return false;
      }

      if (!$.isArray(feature)) {
         feature = $.makeArray(feature);
      }

      var check = function(knownCapabilities) {
         if (!knownCapabilities) {
            return null;
         }
         var i;
         for (i = 0; i < feature.length; i++) {
            if (knownCapabilities['features'].indexOf(feature[i]) < 0) {
               return false;
            }
         }
         return true;
      };

      if (conn.caps._jidVerIndex[jid] && conn.caps._knownCapabilities[conn.caps._jidVerIndex[jid]]) {
         var hasFeature = check(conn.caps._knownCapabilities[conn.caps._jidVerIndex[jid]]);
         cb(hasFeature);

         return hasFeature;
      }

      $(document).on('strophe.caps', function(ev, j, capabilities) {
         if (j === jid) {
            cb(check(capabilities));

            $(document).off(ev);
         }
      });

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
 * Load message object with given uid.
 * 
 * @class Message
 * @memberOf jsxc
 * @param {string} uid Unified identifier from message object
 */
/**
 * Create new message object.
 *
 * @class Message
 * @memberOf jsxc
 * @param {object} args New message properties
 * @param {string} args.bid
 * @param {direction} args.direction
 * @param {string} args.msg
 * @param {boolean} args.encrypted
 * @param {boolean} args.forwarded
 * @param {boolean} args.sender
 * @param {integer} args.stamp
 * @param {object} args.attachment Attached data
 * @param {string} args.attachment.name File name
 * @param {string} args.attachment.size File size
 * @param {string} args.attachment.type File type
 * @param {string} args.attachment.data File data
 */

jsxc.Message = function() {

   /** @member {string} */
   this._uid = null;

   /** @member {boolean} */
   this._received = false;

   /** @member {boolean} */
   this.encrypted = false;

   /** @member {boolean} */
   this.forwarded = false;

   /** @member {integer} */
   this.stamp = new Date().getTime();

   if (typeof arguments[0] === 'string' && arguments[0].length > 0 && arguments.length === 1) {
      this._uid = arguments[0];

      this.load(this._uid);
   } else if (typeof arguments[0] === 'object' && arguments[0] !== null) {
      $.extend(this, arguments[0]);
   }

   if (!this._uid) {
      this._uid = new Date().getTime() + ':msg';
   }
};

/**
 * Load message properties.
 *
 * @memberof jsxc.Message
 * @param  {string} uid
 */
jsxc.Message.prototype.load = function(uid) {
   var data = jsxc.storage.getUserItem('msg', uid);

   if (!data) {
      jsxc.debug('Could not load message with uid ' + uid);
   }

   $.extend(this, data);
};

/**
 * Save message properties and create thumbnail.
 *
 * @memberOf jsxc.Message
 * @return {Message} this object
 */
jsxc.Message.prototype.save = function() {
   var history;

   if (this.bid) {
      history = jsxc.storage.getUserItem('history', this.bid) || [];

      if (history.indexOf(this._uid) < 0) {
         if (history.length > jsxc.options.get('numberOfMsg')) {
            jsxc.Message.delete(history.pop());
         }
      } else {
         history = null;
      }
   }

   if (Image && this.attachment && this.attachment.type.match(/^image\//i) && this.attachment.data) {
      var sHeight, sWidth, sx, sy;
      var dHeight = 100,
         dWidth = 100;
      var canvas = $("<canvas>").get(0);

      canvas.width = dWidth;
      canvas.height = dHeight;

      var ctx = canvas.getContext("2d");
      var img = new Image();

      img.src = this.attachment.data;

      if (img.height > img.width) {
         sHeight = img.width;
         sWidth = img.width;
         sx = 0;
         sy = (img.height - img.width) / 2;
      } else {
         sHeight = img.height;
         sWidth = img.height;
         sx = (img.width - img.height) / 2;
         sy = 0;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);

      this.attachment.thumbnail = canvas.toDataURL();

      if (this.direction === 'out') {
         // save storage
         this.attachment.data = null;
      }
   }

   var data;

   if (this.attachment && this.attachment.size > jsxc.options.maxStorableSize && this.direction === 'in') {
      jsxc.debug('Attachment to large to store');

      data = this.attachment.data;
      this.attachment.data = null;
      this.attachment.persistent = false;

      //TODO inform user
   }

   jsxc.storage.setUserItem('msg', this._uid, this);

   if (history) {
      history.unshift(this._uid);

      jsxc.storage.setUserItem('history', this.bid, history);
   }

   if (data && this.attachment) {
      this.attachment.data = data;
   }

   return this;
};

/**
 * Remove object from storage.
 * 
 * @memberOf jsxc.Message
 */
jsxc.Message.prototype.delete = function() {
   jsxc.Message.delete(this._uid);
};

/**
 * Returns object as jquery object.
 *
 * @memberOf jsxc.Message
 * @return {jQuery} Representation in DOM
 */
jsxc.Message.prototype.getDOM = function() {
   return jsxc.Message.getDOM(this._uid);
};

/**
 * Mark message as received.
 * 
 * @memberOf jsxc.Message
 */
jsxc.Message.prototype.received = function() {
   this._received = true;
   this.save();

   this.getDOM().addClass('jsxc_received');
};

/**
 * Returns true if the message was already received.
 *
 * @memberOf jsxc.Message
 * @return {boolean} true means received
 */
jsxc.Message.prototype.isReceived = function() {
   return this._received;
};

/**
 * Remove message with uid.
 *
 * @memberOf jsxc.Message
 * @static
 * @param  {string} uid message uid
 */
jsxc.Message.delete = function(uid) {
   var data = jsxc.storage.getUserItem('msg', uid);

   if (data) {
      jsxc.storage.removeUserItem('msg', uid);

      if (data.bid) {
         var history = jsxc.storage.getUserItem('history', data.bid) || [];

         history = $.grep(history, function(el) {
            return el !== uid;
         });

         jsxc.storage.setUserItem('history', data.bid);
      }
   }
};

/**
 * Returns message object as jquery object.
 *
 * @memberOf jsxc.Message
 * @static
 * @param  {string} uid message uid
 * @return {jQuery} jQuery representation in DOM
 */
jsxc.Message.getDOM = function(uid) {
   return $('#' + uid.replace(/:/g, '-'));
};

/**
 * Message direction can be incoming, outgoing or system.
 * 
 * @typedef {(jsxc.Message.IN|jsxc.Message.OUT|jsxc.Message.SYS)} direction
 */

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.IN = 'in';

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.OUT = 'out';

/**
 * @constant
 * @type {string}
 * @default
 */
jsxc.Message.SYS = 'sys';

/* global Favico, emojione*/
/**
 * Handle functions for chat window's and buddylist
 * 
 * @namespace jsxc.gui
 */
jsxc.gui = {
   /** Smilie token to file mapping */
   emotions: [
      ['O:-) O:)', 'innocent'],
      ['>:-( >:( &gt;:-( &gt;:(', 'angry'],
      [':-) :)', 'slight_smile'],
      [':-D :D', 'grin'],
      [':-( :(', 'disappointed'],
      [';-) ;)', 'wink'],
      [':-P :P', 'stuck_out_tongue'],
      ['=-O', 'astonished'],
      [':kiss: :-*', 'kissing_heart'],
      ['8-) :cool:', 'sunglasses'],
      [':-X :X', 'zipper_mouth'],
      [':yes:', 'thumbsup'],
      [':no:', 'thumbsdown'],
      [':beer:', 'beer'],
      [':coffee:', 'coffee'],
      [':devil:', 'smiling_imp'],
      [':kiss: :kissing:', 'kissing'],
      ['@->-- @-&gt;--', 'rose'],
      [':music:', 'musical_note'],
      [':love:', 'heart_eyes'],
      [':heart:', 'heart'],
      [':brokenheart:', 'broken_heart'],
      [':zzz:', 'zzz'],
      [':wait:', 'hand_splayed']
   ],

   favicon: null,

   regShortNames: null,

   emoticonList: {
      'core': {
         ':klaus:': ['klaus'],
         ':jabber:': ['jabber'],
         ':xmpp:': ['xmpp'],
         ':jsxc:': ['jsxc'],
         ':owncloud:': ['owncloud']
      },
      'emojione': emojione.emojioneList
   },

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

      jsxc.gui.regShortNames = new RegExp(emojione.regShortNames.source + '|(' + Object.keys(jsxc.gui.emoticonList.core).join('|') + ')', 'gi');

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
      jsxc.gui.updatePresence(bid, jsxc.CONST.STATUS[data.status]);

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

      var info = Strophe.getBareJidFromJid(data.jid) + '\n';
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
         var handler_cb = function(stanza) {
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
         };

         var error_cb = function(msg) {
            jsxc.warn('Could not load vcard.', msg);

            jsxc.storage.setUserItem('avatar', aid, 0);
            setAvatar(0);
         };

         // workaround for https://github.com/strophe/strophejs/issues/172
         if (Strophe.getBareJidFromJid(jid) === Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid)) {
            jsxc.xmpp.conn.vcard.get(handler_cb, error_cb);
         } else {
            jsxc.xmpp.conn.vcard.get(handler_cb, Strophe.getBareJidFromJid(jid), error_cb);
         }
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
    * @deprecated Use {@link jsxc.gui.window.get} instead.
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
   toggleList: function(el) {
      var self = el || $(this);

      self.disableSelection();

      self.addClass('jsxc_list');

      var ul = self.find('ul');
      var slideUp = null;

      slideUp = function() {

         self.removeClass('jsxc_opened');

         $('body').off('click', null, slideUp);
      };

      $(this).click(function() {

         if (!self.hasClass('jsxc_opened')) {
            // hide other lists
            $('body').click();
            $('body').one('click', slideUp);
         } else {
            $('body').off('click', null, slideUp);
         }

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

      jsxc.gui.dialog.open(jsxc.gui.template.get('authenticationDialog', bid), {
         name: 'smp'
      });

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

         jsxc.gui.dialog.close('smp');

         jsxc.storage.updateUserItem('buddy', bid, 'trust', true);
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.SYS,
            msg: $.t('conversation_is_now_verified')
         });
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
            jsxc.storage.setUserItem('smp', bid, {
               sec: sec,
               quest: quest
            });
         }

         jsxc.gui.dialog.close('smp');

         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.SYS,
            msg: $.t('authentication_query_sent')
         });
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
            jsxc.storage.setUserItem('smp', bid, {
               sec: sec,
               quest: null
            });
         }

         jsxc.gui.dialog.close('smp');

         jsxc.gui.window.postMessage({
            bid: bid,
            direction: 'sys',
            msg: $.t('authentication_query_sent')
         });
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
            if (typeof navigator[key] === 'string') {
               userInfo += '<b>' + key + ':</b> ' + navigator[key] + '<br />';
            }
         }
      }

      if ($.fn && $.fn.jquery) {
         userInfo += '<b>jQuery:</b> ' + $.fn.jquery + '<br />';
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

         var cb = function(success) {
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
         };

         jsxc.options.saveSettinsPermanent.call(this, data, cb);

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

      $('#jsxc_presence > span').text($('#jsxc_presence .jsxc_inner ul .jsxc_' + pres).text());

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

      $('[data-bid="' + bid + '"]').each(function() {
         var el = $(this);

         el.attr('data-status', pres);

         if (el.find('.jsxc_avatar').length > 0) {
            el = el.find('.jsxc_avatar');
         }

         el.removeClass('jsxc_' + jsxc.CONST.STATUS.join(' jsxc_')).addClass('jsxc_' + pres);
      });
   },

   /**
    * Switch read state to UNread and increase counter.
    * 
    * @memberOf jsxc.gui
    * @param bid
    */
   unreadMsg: function(bid) {
      var winData = jsxc.storage.getUserItem('window', bid) || {};
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

      container.find('a[href^="mailto:"],a[href^="xmpp:"]').each(function() {
         var spot = $("<span>X</span>").addClass("jsxc_spot");
         var href = $(this).attr("href").replace(/^ *(mailto|xmpp):/, "").trim();

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
   },

   /**
    * Replace shortname emoticons with images.
    * 
    * @param  {string} str text with emoticons as shortname
    * @return {string} text with emoticons as images
    */
   shortnameToImage: function(str) {
      str = str.replace(jsxc.gui.regShortNames, function(shortname) {
         if (typeof shortname === 'undefined' || shortname === '' || (!(shortname in jsxc.gui.emoticonList.emojione) && !(shortname in jsxc.gui.emoticonList.core))) {
            return shortname;
         }

         var src, filename;

         if (jsxc.gui.emoticonList.core[shortname]) {
            filename = jsxc.gui.emoticonList.core[shortname][jsxc.gui.emoticonList.core[shortname].length - 1].replace(/^:([^:]+):$/, '$1');
            src = jsxc.options.root + '/img/emotions/' + filename + '.svg';
         } else if (jsxc.gui.emoticonList.emojione[shortname]) {
            filename = jsxc.gui.emoticonList.emojione[shortname][jsxc.gui.emoticonList.emojione[shortname].length - 1];
            src = jsxc.options.root + '/lib/emojione/assets/svg/' + filename + '.svg';
         }

         var div = $('<div>');

         div.addClass('jsxc_emoticon');
         div.css('background-image', 'url(' + src + ')');
         div.attr('title', shortname);

         return div.prop('outerHTML');
      });

      return str;
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
         window.open(jsxc.options.onlineHelp, 'onlineHelp');
      });

      $('#jsxc_roster .jsxc_about').click(function() {
         jsxc.gui.showAboutDialog();
      });

      $('#jsxc_toggleRoster').click(function() {
         jsxc.gui.roster.toggle();
      });

      $('#jsxc_presence li').click(function() {
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
      $('#jsxc_windowList').addClass('jsxc_roster_' + rosterState);

      var pres = jsxc.storage.getUserItem('presence') || 'online';
      $('#jsxc_presence > span').text($('#jsxc_presence .jsxc_' + pres).text());
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

      bud.find('.jsxc_msg').click(function() {
         jsxc.gui.window.open(bid);

         return false;
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

         $('body').click();

         if (!bud.find('.jsxc_menu').hasClass('jsxc_open')) {
            bud.find('.jsxc_menu').addClass('jsxc_open');

            $('body').one('click', function() {
               bud.find('.jsxc_menu').removeClass('jsxc_open');
            });
         }

         return false;
      };

      bud.find('.jsxc_more').click(expandClick);

      bud.find('.jsxc_vcard').click(function() {
         jsxc.gui.showVcard(data.jid);

         return false;
      });

      jsxc.gui.update(bid);

      // update scrollbar
      $('#jsxc_buddylist').slimScroll({
         scrollTo: '0px'
      });

      var history = jsxc.storage.getUserItem('history', bid) || [];
      var i = 0;
      while (history.length > i) {
         var message = new jsxc.Message(history[i]);
         if (message.direction !== jsxc.Message.SYS) {
            $('[data-bid="' + bid + '"]').find('.jsxc_lastmsg .jsxc_text').html(message.msg);
            break;
         }
         i++;
      }

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
      var options = jsxc.gui.roster.getItem(bid).find('.jsxc_lastmsg, .jsxc_more');
      var input = $('<input type="text" name="name"/>');

      // hide more menu
      $('body').click();

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
    * @param {string} state Toggle to state
    */
   toggle: function(state) {
      var duration;

      var roster = $('#jsxc_roster');
      var wl = $('#jsxc_windowList');

      if (!state) {
         state = (jsxc.storage.getUserItem('roster') === jsxc.CONST.HIDDEN) ? jsxc.CONST.SHOWN : jsxc.CONST.HIDDEN;
      }

      if (state === 'shown' && jsxc.isExtraSmallDevice()) {
         jsxc.gui.window.hide();
      }

      jsxc.storage.setUserItem('roster', state);

      roster.removeClass('jsxc_state_hidden jsxc_state_shown').addClass('jsxc_state_' + state);
      wl.removeClass('jsxc_roster_hidden jsxc_roster_shown').addClass('jsxc_roster_' + state);

      duration = parseFloat(roster.css('transitionDuration') || 0) * 1000;

      setTimeout(function() {
         jsxc.gui.updateWindowListSB();
      }, duration);

      $(document).trigger('toggle.roster.jsxc', [state, duration]);

      return duration;
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

      var opt = $.extend({
         name: ''
      }, o);

      $.magnificPopup.open({
         items: {
            src: '<div data-name="' + opt.name + '" id="jsxc_dialog">' + data + '</div>'
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
    * If no name is provided every dialog will be closed, 
    * otherwise only dialog with given name is closed.
    *
    * @param {string} [name] Close only dialog with the given name
    */
   close: function(name) {
      jsxc.debug('close dialog');

      if (typeof name === 'string' && name.length > 0 && !jsxc.el_exists('#jsxc_dialog[data-name=' + name + ']')) {
         return;
      }

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

      var win = jsxc.gui.windowTemplate.clone().attr('data-bid', bid).appendTo('#jsxc_windowList > ul');
      var data = jsxc.storage.getUserItem('buddy', bid);

      // Attach jid to window
      win.data('jid', data.jid);

      // Add handler

      // @TODO generalize this. Duplicate of jsxc.roster.add
      var expandClick = function() {
         win.trigger('extra.jsxc');

         $('body').click();

         if (!win.find('.jsxc_menu').hasClass('jsxc_open')) {
            win.find('.jsxc_menu').addClass('jsxc_open');

            $('body').one('click', function() {
               win.find('.jsxc_menu').removeClass('jsxc_open');
            });
         }

         return false;
      };

      win.find('.jsxc_more').click(expandClick);

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

      win.find('.jsxc_sendFile').click(function() {
         $('body').click();

         jsxc.gui.window.sendFile(bid);
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

         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.OUT,
            msg: $(this).val()
         });

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

      win.find('.jsxc_name').disableSelection();

      win.find('.slimScrollDiv').resizable({
         handles: 'w, nw, n',
         minHeight: 234,
         minWidth: 250,
         resize: function(event, ui) {
            jsxc.gui.window.resize(win, ui);
         },
         start: function() {
            win.removeClass('jsxc_normal');
         },
         stop: function() {
            win.addClass('jsxc_normal');
         }
      });

      win.find('.jsxc_window').css('bottom', -1 * win.find('.jsxc_fade').height());

      if ($.inArray(bid, jsxc.storage.getUserItem('windowlist')) < 0) {

         // add window to windowlist
         var wl = jsxc.storage.getUserItem('windowlist') || [];
         wl.push(bid);
         jsxc.storage.setUserItem('windowlist', wl);

         // init window element in storage
         jsxc.storage.setUserItem('window', bid, {
            minimize: true,
            text: '',
            unread: 0
         });

         jsxc.gui.window.hide(bid);
      } else {

         if (jsxc.storage.getUserItem('window', bid).unread) {
            jsxc.gui._unreadMsg(bid);
         }
      }

      $.each(jsxc.gui.emotions, function(i, val) {
         var ins = val[0].split(' ')[0];
         var li = $('<li>');
         li.append(jsxc.gui.shortnameToImage(':' + val[1] + ':'));
         li.find('div').attr('title', ins);
         li.click(function() {
            win.find('input').val(win.find('input').val() + ins);
            win.find('input').focus();
         });
         win.find('.jsxc_emoticons ul').prepend(li);
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
    * Resize given window to given size. If no size is provided the window is resized to the default size.
    * 
    * @param  {(string|jquery)} win Bid or window object
    * @param  {object} ui    The size has to be in the format {size:{width: [INT], height: [INT]}}
    * @param  {boolean} [outer] If true the given size is used as outer dimensions.
    */
   resize: function(win, ui, outer) {
      var bid;

      if (typeof win === 'object') {
         bid = win.attr('data-bid');
      } else if (typeof win === 'string') {
         bid = win;
         win = jsxc.gui.window.get(bid);
      } else {
         jsxc.warn('jsxc.gui.window.resize has to be called either with bid or window object.');
         return;
      }

      if (!win.attr('data-default-height')) {
         win.attr('data-default-height', win.find('.ui-resizable').height());
      }

      if (!win.attr('data-default-width')) {
         win.attr('data-default-width', win.find('.ui-resizable').width());
      }

      var outer_height_diff = (outer) ? win.find('.jsxc_window').outerHeight() - win.find('.ui-resizable').height() : 0;

      ui = $.extend({
         size: {
            width: parseInt(win.attr('data-default-width')),
            height: parseInt(win.attr('data-default-height')) + outer_height_diff
         }
      }, ui || {});

      if (outer) {
         ui.size.height -= outer_height_diff;
      }

      win.find('.slimScrollDiv').css({
         width: ui.size.width,
         height: ui.size.height
      });

      win.width(ui.size.width);

      win.find('.jsxc_textarea').slimScroll({
         height: ui.size.height
      });

      // var offset = win.find('.slimScrollDiv').position().top;
      //win.find('.jsxc_emoticons').css('top', (ui.size.height + offset + 6) + 'px');

      $(document).trigger('resize.window.jsxc', [win, bid, ui.size]);
   },

   fullsize: function(bid) {
      var win = jsxc.gui.window.get(bid);
      var size = jsxc.options.viewport.getSize();

      size.width -= 10;
      size.height -= win.find('.jsxc_bar').outerHeight() + win.find('.jsxc_textinput').outerHeight();

      jsxc.gui.window.resize(win, {
         size: size
      });
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
      jsxc.gui.window.get(bid).remove();
      jsxc.gui.updateWindowListSB();
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

      if (win.hasClass('jsxc_min')) {
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

      return jsxc.gui.window._show(bid);
   },

   /**
    * Maximize text area
    * 
    * @param {String} bid
    * @returns {undefined}
    */
   _show: function(bid) {
      var win = jsxc.gui.window.get(bid);
      var duration = 0;

      if (jsxc.isExtraSmallDevice()) {
         if (parseFloat($('#jsxc_roster').css('right')) >= 0) {
            duration = jsxc.gui.roster.toggle();
         }

         jsxc.gui.window.hide();
         jsxc.gui.window.fullsize(bid);
      }

      win.removeClass('jsxc_min').addClass('jsxc_normal');
      win.find('.jsxc_window').css('bottom', '0');

      setTimeout(function() {
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
      }, duration);

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
    * @param {String} [bid]
    */
   hide: function(bid) {
      var hide = function(bid) {
         jsxc.storage.updateUserItem('window', bid, 'minimize', true);

         jsxc.gui.window._hide(bid);
      };

      if (bid) {
         hide(bid);
      } else {
         $('#jsxc_windowList > ul > li').each(function() {
            var el = $(this);

            if (!el.hasClass('jsxc_min')) {
               hide(el.attr('data-bid'));
            }
         });
      }
   },

   /**
    * Minimize text area
    * 
    * @param {String} bid
    */
   _hide: function(bid) {
      var win = jsxc.gui.window.get(bid);

      win.removeClass('jsxc_normal').addClass('jsxc_min');
      win.find('.jsxc_window').css('bottom', -1 * win.find('.jsxc_fade').height());

      win.trigger('hidden.window.jsxc');
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
    * Write Message to chat area and save. Check border cases and remove html.
    * 
    * @function postMessage
    * @memberOf jsxc.gui.window
    * @param {jsxc.Message} message object to be send
    * @return {jsxc.Message} maybe modified message object
    */
   /**
    * Create message object from given properties, write Message to chat area 
    * and save. Check border cases and remove html.
    * 
    * @function postMessage
    * @memberOf jsxc.gui.window
    * @param {object} args New message properties
    * @param {string} args.bid
    * @param {direction} args.direction
    * @param {string} args.msg
    * @param {boolean} args.encrypted
    * @param {boolean} args.forwarded
    * @param {boolean} args.sender
    * @param {integer} args.stamp
    * @param {object} args.attachment Attached data
    * @param {string} args.attachment.name File name
    * @param {string} args.attachment.size File size
    * @param {string} args.attachment.type File type
    * @param {string} args.attachment.data File data
    * @return {jsxc.Message} maybe modified message object
    */
   postMessage: function(message) {

      if (typeof message === 'object' && !(message instanceof jsxc.Message)) {
         message = new jsxc.Message(message);
      }

      var data = jsxc.storage.getUserItem('buddy', message.bid);
      var html_msg = message.msg;

      // remove html tags and reencode html tags
      message.msg = jsxc.removeHTML(message.msg);
      message.msg = jsxc.escapeHTML(message.msg);

      // exceptions:

      if (message.direction === jsxc.Message.OUT && data.msgstate === OTR.CONST.MSGSTATE_FINISHED && message.forwarded !== true) {
         message.direction = jsxc.Message.SYS;
         message.msg = $.t('your_message_wasnt_send_please_end_your_private_conversation');
      }

      if (message.direction === jsxc.Message.OUT && data.msgstate === OTR.CONST.MSGSTATE_FINISHED) {
         message.direction = 'sys';
         message.msg = $.t('unencrypted_message_received') + ' ' + message.msg;
      }

      message.encrypted = message.encrypted || data.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED;

      try {
         message.save();
      } catch (err) {
         jsxc.warn('Unable to save message.', err);

         message = new jsxc.Message({
            msg: 'Unable to save that message. Please clear some chat histories.',
            direction: jsxc.Message.SYS
         });
      }

      if (message.direction === 'in' && !jsxc.gui.window.get(message.bid).find('.jsxc_textinput').is(":focus")) {
         jsxc.gui.unreadMsg(message.bid);

         $(document).trigger('postmessagein.jsxc', [message.bid, html_msg]);
      }

      if (message.direction === jsxc.Message.OUT && jsxc.master && message.forwarded !== true && html_msg) {
         jsxc.xmpp.sendMessage(message.bid, html_msg, message._uid);
      }

      jsxc.gui.window._postMessage(message);

      if (message.direction === 'out' && message.msg === '?') {
         jsxc.gui.window.postMessage(new jsxc.Message({
            bid: message.bid,
            direction: jsxc.Message.SYS,
            msg: '42'
         }));
      }

      return message;
   },

   /**
    * Write Message to chat area
    * 
    * @param {String} bid bar jid
    * @param {Object} post Post object with direction, msg, uid, received
    * @param {Bool} restore If true no highlights are used
    */
   _postMessage: function(message, restore) {
      var bid = message.bid;
      var win = jsxc.gui.window.get(bid);
      var msg = message.msg;
      var direction = message.direction;
      var uid = message._uid;

      if (win.find('.jsxc_textinput').is(':not(:focus)') && direction === jsxc.Message.IN && !restore) {
         jsxc.gui.window.highlight(bid);
      }

      msg = msg.replace(jsxc.CONST.REGEX.URL, function(url) {

         var href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

         // @TODO use jquery element builder
         return '<a href="' + href + '" target="_blank">' + url + '</a>';
      });

      msg = msg.replace(new RegExp('(xmpp:)?(' + jsxc.CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i'), function(match, protocol, jid, action) {
         if (protocol === 'xmpp:') {
            if (typeof action === 'string') {
               jid += action;
            }

            // @TODO use jquery element builder
            return '<a href="xmpp:' + jid + '">xmpp:' + jid + '</a>';
         }

         // @TODO use jquery element builder
         return '<a href="mailto:' + jid + '" target="_blank">mailto:' + jid + '</a>';
      });

      // replace emoticons from XEP-0038 and pidgin with shortnames
      $.each(jsxc.gui.emotions, function(i, val) {
         msg = msg.replace(val[2], ':' + val[1] + ':');
      });

      // translate shortnames to images
      msg = jsxc.gui.shortnameToImage(msg);

      // replace line breaks
      msg = msg.replace(/(\r\n|\r|\n)/g, '<br />');

      var msgDiv = $("<div>"),
         msgTsDiv = $("<div>");
      msgDiv.addClass('jsxc_chatmessage jsxc_' + direction);
      msgDiv.attr('id', uid.replace(/:/g, '-'));
      msgDiv.html('<div>' + msg + '</div>');
      msgTsDiv.addClass('jsxc_timestamp');
      msgTsDiv.text(jsxc.getFormattedTime(message.stamp));

      if (message.isReceived() || false) {
         msgDiv.addClass('jsxc_received');
      }

      if (message.forwarded) {
         msgDiv.addClass('jsxc_forwarded');
      }

      if (message.encrypted) {
         msgDiv.addClass('jsxc_encrypted');
      }

      if (message.attachment && message.attachment.name) {
         var attachment = $('<div>');
         attachment.addClass('jsxc_attachment');
         attachment.addClass('jsxc_' + message.attachment.type.replace(/\//, '-'));
         attachment.addClass('jsxc_' + message.attachment.type.replace(/^([^/]+)\/.*/, '$1'));

         if (message.attachment.persistent === false) {
            attachment.addClass('jsxc_notPersistent');
         }

         if (message.attachment.data) {
            attachment.addClass('jsxc_data');
         }

         if (message.attachment.type.match(/^image\//) && message.attachment.thumbnail) {
            $('<img alt="preview">').attr('src', message.attachment.thumbnail).attr('title', message.attachment.name).appendTo(attachment);
         } else {
            attachment.text(message.attachment.name);
         }

         if (message.attachment.data) {
            attachment = $('<a>').append(attachment);
            attachment.attr('href', message.attachment.data);
            attachment.attr('download', message.attachment.name);
         }

         msgDiv.find('div').first().append(attachment);
      }

      if (direction === 'sys') {
         jsxc.gui.window.get(bid).find('.jsxc_textarea').append('<div style="clear:both"/>');
      } else if (typeof message.stamp !== 'undefined') {
         msgDiv.append(msgTsDiv);
      }

      if (direction !== 'sys') {
         $('[data-bid="' + bid + '"]').find('.jsxc_lastmsg .jsxc_text').html(msg);
      }

      if (jsxc.Message.getDOM(uid).length > 0) {
         jsxc.Message.getDOM(uid).replaceWith(msgDiv);
      } else {
         win.find('.jsxc_textarea').append(msgDiv);
      }

      if (typeof message.sender === 'object' && message.sender !== null) {
         var title = '';
         var avatarDiv = $('<div>');
         avatarDiv.addClass('jsxc_avatar').prependTo(msgDiv);

         if (typeof message.sender.jid === 'string') {
            msgDiv.attr('data-bid', jsxc.jidToBid(message.sender.jid));

            var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(message.sender.jid)) || {};
            jsxc.gui.updateAvatar(msgDiv, jsxc.jidToBid(message.sender.jid), data.avatar);

            title = jsxc.jidToBid(message.sender.jid);
         }

         if (typeof message.sender.name === 'string') {
            msgDiv.attr('data-name', message.sender.name);

            if (typeof message.sender.jid !== 'string') {
               jsxc.gui.avatarPlaceholder(avatarDiv, message.sender.name);
            }

            if (title !== '') {
               title = '\n' + title;
            }

            title = message.sender.name + title;

            msgTsDiv.text(msgTsDiv.text() + ' ' + message.sender.name);
         }

         avatarDiv.attr('title', jsxc.escapeHTML(title));

         if (msgDiv.prev().length > 0 && msgDiv.prev().find('.jsxc_avatar').attr('title') === avatarDiv.attr('title')) {
            avatarDiv.css('visibility', 'hidden');
         }
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

      // convert legacy storage structure introduced in v3.0.0
      if (chat) {
         while (chat !== null && chat.length > 0) {
            var c = chat.pop();

            c.bid = bid;
            c._uid = c.uid;
            delete c.uid;

            var message = new jsxc.Message(c);
            message.save();

            jsxc.gui.window._postMessage(message, true);
         }

         jsxc.storage.removeUserItem('chat', bid);
      }

      var history = jsxc.storage.getUserItem('history', bid);

      while (history !== null && history.length > 0) {
         var uid = history.pop();

         jsxc.gui.window._postMessage(new jsxc.Message(uid), true);
      }
   },

   /**
    * Clear chat history
    * 
    * @param {type} bid
    * @returns {undefined}
    */
   clear: function(bid) {
      // deprecated
      jsxc.storage.removeUserItem('chat', bid);

      var history = jsxc.storage.getUserItem('history', bid) || [];

      history.map(function(id) {
         jsxc.storage.removeUserItem('msg', id);
      });

      jsxc.storage.setUserItem('history', bid, []);

      var win = jsxc.gui.window.get(bid);

      if (win.length > 0) {
         win.find('.jsxc_textarea').empty();
      }
   },

   /**
    * Mark message as received.
    * 
    * @param  {string} bid
    * @param  {string} uid message id
    * @deprecated since v3.0.0. Use {@link jsxc.Message.received}.
    */
   receivedMessage: function(bid, uid) {
      jsxc.warn('Using deprecated receivedMessage.');

      var message = new jsxc.Message(uid);

      message.received();
   },

   updateProgress: function(message, sent, size) {
      var div = message.getDOM();
      var span = div.find('.jsxc_timestamp span');

      if (span.length === 0) {
         div.find('.jsxc_timestamp').append('<span>');
         span = div.find('.jsxc_timestamp span');
      }

      span.text(' ' + Math.round(sent / size * 100) + '%');

      if (sent === size) {
         span.remove();

         message.received();
      }
   },

   showOverlay: function(bid, content, allowClose) {
      var win = jsxc.gui.window.get(bid);

      win.find('.jsxc_overlay .jsxc_body').empty().append(content);
      win.find('.jsxc_overlay .jsxc_close').off('click').click(function() {
         jsxc.gui.window.hideOverlay(bid);
      });

      if (allowClose !== true) {
         win.find('.jsxc_overlay .jsxc_close').hide();
      } else {
         win.find('.jsxc_overlay .jsxc_close').show();
      }

      win.addClass('jsxc_showOverlay');
   },

   hideOverlay: function(bid) {
      var win = jsxc.gui.window.get(bid);

      win.removeClass('jsxc_showOverlay');
   },

   selectResource: function(bid, text, cb, res) {
      res = res || jsxc.storage.getUserItem('res', bid) || [];
      cb = cb || function() {};

      if (res.length > 0) {
         var content = $('<div>');
         var list = $('<ul>'),
            i, li;

         for (i = 0; i < res.length; i++) {
            li = $('<li>');

            li.append($('<a>').text(res[i]));
            li.appendTo(list);
         }

         list.find('a').click(function(ev) {
            ev.preventDefault();

            jsxc.gui.window.hideOverlay(bid);

            cb({
               status: 'selected',
               result: $(this).text()
            });
         });

         if (text) {
            $('<p>').text(text).appendTo(content);
         }

         list.appendTo(content);

         jsxc.gui.window.showOverlay(bid, content);
      } else {
         cb({
            status: 'unavailable'
         });
      }
   },

   smpRequest: function(bid, question) {
      var content = $('<div>');

      var p = $('<p>');
      p.text($.t('smpRequestReceived'));
      p.appendTo(content);

      var abort = $('<button>');
      abort.text($.t('Abort'));
      abort.click(function() {
         jsxc.gui.window.hideOverlay(bid);
         jsxc.storage.removeUserItem('smp', bid);

         if (jsxc.master && jsxc.otr.objects[bid]) {
            jsxc.otr.objects[bid].sm.abort();
         }
      });
      abort.appendTo(content);

      var verify = $('<button>');
      verify.text($.t('Verify'));
      verify.addClass('jsxc_btn jsxc_btn-primary');
      verify.click(function() {
         jsxc.gui.window.hideOverlay(bid);

         jsxc.otr.onSmpQuestion(bid, question);
      });
      verify.appendTo(content);

      jsxc.gui.window.showOverlay(bid, content);
   },

   sendFile: function(jid) {
      var bid = jsxc.jidToBid(jid);
      var win = jsxc.gui.window.get(bid);
      var res = Strophe.getResourceFromJid(jid);

      if (!res) {
         jid = win.data('jid');
         res = Strophe.getResourceFromJid(jid);

         var fileCapableRes = jsxc.webrtc.getCapableRes(jid, jsxc.webrtc.reqFileFeatures);
         var resources = Object.keys(jsxc.storage.getUserItem('res', bid)) || [];

         if (res === null && resources.length === 1 && fileCapableRes.length === 1) {
            res = fileCapableRes[0];
            jid = bid + '/' + res;
         } else if (fileCapableRes.indexOf(res) < 0) {
            jsxc.gui.window.selectResource(bid, $.t('Your_contact_uses_multiple_clients_'), function(data) {
               if (data.status === 'unavailable') {
                  jsxc.gui.window.hideOverlay(bid);
               } else if (data.status === 'selected') {
                  jsxc.gui.window.sendFile(bid + '/' + data.result);
               }
            }, fileCapableRes);

            return;
         }
      }

      var msg = $('<div><div><label><input type="file" name="files" /><label></div></div>');
      msg.addClass('jsxc_chatmessage');

      jsxc.gui.window.showOverlay(bid, msg, true);

      msg.find('label').click();

      msg.find('[type="file"]').change(function(ev) {
         var file = ev.target.files[0]; // FileList object

         if (!file) {
            return;
         }

         var attachment = $('<div>');
         attachment.addClass('jsxc_attachment');
         attachment.addClass('jsxc_' + file.type.replace(/\//, '-'));
         attachment.addClass('jsxc_' + file.type.replace(/^([^/]+)\/.*/, '$1'));

         msg.empty().append(attachment);

         if (FileReader && file.type.match(/^image\//)) {
            var img = $('<img alt="preview">').attr('title', file.name);
            img.attr('src', jsxc.options.get('root') + '/img/loading.gif');
            img.appendTo(attachment);

            var reader = new FileReader();

            reader.onload = function() {
               img.attr('src', reader.result);
            };

            reader.readAsDataURL(file);
         } else {
            attachment.text(file.name + ' (' + file.size + ' byte)');
         }

         $('<button>').addClass('jsxc_btn jsxc_btn-primary').text($.t('Send')).click(function() {
            var sess = jsxc.webrtc.sendFile(jid, file);

            jsxc.gui.window.hideOverlay(bid);

            var message = jsxc.gui.window.postMessage({
               _uid: sess.sid + ':msg',
               bid: bid,
               direction: 'out',
               attachment: {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  data: (file.type.match(/^image\//)) ? img.attr('src') : null
               }
            });

            sess.sender.on('progress', function(sent, size) {
               jsxc.gui.window.updateProgress(message, sent, size);
            });

            msg.remove();

         }).appendTo(msg);

         $('<button>').addClass('jsxc_btn jsxc_btn-default').text($.t('Abort')).click(function() {
            jsxc.gui.window.hideOverlay(bid);
         }).appendTo(msg);
      });
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
      var li = $('<li>').attr('class', 'jsxc_joinChat jsxc_groupcontacticon').text($.t('Join_chat'));

      li.click(jsxc.muc.showJoinChat);

      $('#jsxc_menu ul .jsxc_about').before(li);
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

                  var bookmark = $("#jsxc_bookmark").prop("checked");
                  var autojoin = $('#jsxc_autojoin').prop('checked');

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

               //TODO display subject, number of occupants, etc.

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

         //TODO show error
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

      var submit = $('<button>');
      submit.addClass('btn btn-primary');
      submit.attr('type', 'submit');
      submit.text($.t('Join'));

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

            //TODO display error
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

      if (!jsxc.xmpp.conn) {
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
      destroy.text($.t('Destroy'));
      destroy.addClass('jsxc_destroy');
      destroy.hide();
      destroy.click(function() {
         self.destroy(bid);
      });

      win.find('.jsxc_settings ul').append($('<li>').append(destroy));

      if (roomdata.state > self.CONST.ROOMSTATE.INIT) {
         var member = jsxc.storage.getUserItem('member', bid) || {};

         $.each(member, function(nickname, val) {
            self.insertMember(bid, nickname, val);

            if (nickname === ownNickname && val.affiliation === self.CONST.AFFILIATION.OWNER) {
               destroy.show();
            }
         });
      }

      var leave = $('<a>');
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

         jsxc.storage.setUserItem('roomNames', jsxc.xmpp.conn.muc.roomNames);

         if (jsxc.gui.roster.getItem(room).length === 0) {
            var bl = jsxc.storage.getUserItem('buddylist');
            bl.push(room);
            jsxc.storage.setUserItem('buddylist', bl);

            jsxc.gui.roster.add(room);
         }

         if ($('#jsxc_dialog').length > 0) {
            // User joined the room manually 
            jsxc.gui.window.open(room);
            jsxc.gui.dialog.close();
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

               //TODO display error
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
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('message_not_send_item-not-found')
         });
      } else if ($(message).find('forbidden').length > 0) {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('message_not_send_forbidden')
         });
      } else if ($(message).find('not-acceptable').length > 0) {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('message_not_send_not-acceptable')
         });
      } else {
         jsxc.gui.window.postMessage({
            bid: room,
            direction: jsxc.Message.SYS,
            msg: $.t('message_not_send')
         });
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

                  for (j = 0; j < self.values; j++) {
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

      notice.text(msg);
      notice.attr('title', description || '');
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
   },

   /**
    * Check if there is already a notice for the given function name.
    * 
    * @memberOf jsxc.notice
    * @param {string} fnName Function name
    * @returns {boolean} True if there is >0 functions with the given name
    */
   has: function(fnName) {
      var saved = jsxc.storage.getUserItem('notices') || [];
      var has = false;

      $.each(saved, function(index, val) {
         if (val.fnName === fnName) {
            has = true;

            return false;
         }
      });

      return has;
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
         msg = (msg && msg.match(/^\?OTR/)) ? $.t('Encrypted_message') : msg;
         var data = jsxc.storage.getUserItem('buddy', bid);

         jsxc.notification.notify({
            title: $.t('New_message_from', {
               name: data.name
            }),
            msg: msg,
            soundFile: jsxc.CONST.SOUNDS.MSG,
            source: bid
         });
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
    * @param source Bid which triggered this notification
    */
   notify: function(title, msg, d, force, soundFile, loop, source) {
      if (!jsxc.options.notification || !jsxc.notification.hasPermission()) {
         return; // notifications disabled
      }

      var o;

      if (title !== null && typeof title === 'object') {
         o = title;
      } else {
         o = {
            title: title,
            msg: msg,
            duration: d,
            force: force,
            soundFile: soundFile,
            loop: loop,
            source: source
         };
      }

      if (jsxc.hasFocus() && !o.force) {
         return; // Tab is visible
      }

      var icon = o.icon || jsxc.options.root + '/img/XMPP_logo.png';

      if (typeof o.source === 'string') {
         var data = jsxc.storage.getUserItem('buddy', o.source);
         var src = jsxc.storage.getUserItem('avatar', data.avatar);

         if (typeof src === 'string' && src !== '0') {
            icon = src;
         }
      }

      jsxc.toNotification = setTimeout(function() {

         if (typeof o.soundFile === 'string') {
            jsxc.notification.playSound(o.soundFile, o.loop, o.force);
         }

         var popup = new Notification($.t(o.title), {
            body: $.t(o.msg),
            icon: icon
         });

         var duration = o.duration || jsxc.options.popupDuration;

         if (duration > 0) {
            setTimeout(function() {
               popup.close();
            }, duration);
         }
      }, jsxc.toNotificationDelay);
   },

   /**
    * Checks if browser has support for notifications and add on chrome to the
    * default api.
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

      if (jsxc.notice.has('gui.showRequestNotification')) {
         return;
      }

      $(document).one('postmessagein.jsxc', function() {
         setTimeout(function() {
            jsxc.notice.add($.t('Notifications') + '?', $.t('Should_we_notify_you_'), 'gui.showRequestNotification');
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

      if (jsxc.hasFocus() && !force) {
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
      $('#jsxc_menu .jsxc_muteNotification').text($.t('Unmute'));

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
      $('#jsxc_menu .jsxc_muteNotification').text($.t('Mute'));

      if (external !== true) {
         jsxc.options.set('muteNotification', false);
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
      /** BOSH url */
      url: null,

      /** XMPP JID*/
      jid: null,

      /** XMPP domain */
      domain: null,

      /** XMPP password */
      password: null,

      /** True: Allow user to overwrite xmpp settings */
      overwrite: false,

      /** @deprecated since v2.1.0. Use now loginForm.enable. */
      onlogin: null
   },

   /** default xmpp priorities */
   priority: {
      online: 0,
      chat: 0,
      away: 0,
      xa: 0,
      dnd: 0
   },

   /** If all 3 properties are set and enable is true, the login form is used */
   loginForm: {
      /** False, disables login through login form */
      enable: true,

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
       * Action after login was called: dialog [String] Show wait dialog, false [boolean] | 
       * quiet [String] Do nothing
       */
      onConnecting: 'dialog',

      /**
       * Action after connected: submit [String] Submit form, false [boolean] Do
       * nothing, continue [String] Start chat
       */
      onConnected: 'submit',

      /**
       * Action after auth fail: submit [String] Submit form, false [boolean] | quiet [String] Do
       * nothing, ask [String] Show auth fail dialog
       */
      onAuthFail: 'submit',

      /**
       * True: Attach connection even is login form was found.
       * 
       * @type {Boolean}
       * @deprecated since 3.0.0. Use now loginForm.ifFound (true => attach, false => pause)
       */
      attachIfFound: true,

      /**
       * Describes what we should do if login form was found: 
       * - Attach connection
       * - Force new connection with loginForm.jid and loginForm.passed
       * - Pause connection and do nothing
       * 
       * @type {(attach|force|pause)}
       */
      ifFound: 'attach',

      /**
       * True: Display roster minimized after first login. Afterwards the last 
       * roster state will be used. 
       */
      startMinimized: false
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
   defaultAvatar: function(jid) {
      jsxc.gui.avatarPlaceholder($(this).find('.jsxc_avatar'), jid);
   },

   /**
    * This callback processes all settings.
    * @callback loadSettingsCallback
    * @param settings {object} could be every jsxc option
    */

   /**
    * Returns permanent saved settings and overwrite default jsxc.options.
    * 
    * @memberOf jsxc.options
    * @function
    * @param username {string} username
    * @param password {string} password
    * @param cb {loadSettingsCallback} Callback that handles the result
    */
   loadSettings: null,

   /**
    * Call this function to save user settings permanent.
    * 
    * @memberOf jsxc.options
    * @param data Holds all data as key/value
    * @param cb Called with true on success, false otherwise
    */
   saveSettinsPermanent: function(data, cb) {
      cb(true);
   },

   carbons: {
      /** Enable carbon copies? */
      enable: false
   },

   /**
    * Processes user list.
    * 
    * @callback getUsers-cb
    * @param {object} list List of users, key: username, value: alias
    */

   /**
    * Returns a list of usernames and aliases
    * 
    * @function getUsers
    * @memberOf jsxc.options
    * @param {string} search Search token (start with)
    * @param {getUsers-cb} cb Called with list of users
    */
   getUsers: null,

   /** Options for info in favicon */
   favicon: {
      enable: true,

      /** Favicon info background color */
      bgColor: '#E59400',

      /** Favicon info text color */
      textColor: '#fff'
   },

   /** @deprecated since v2.1.0. Use now RTCPeerConfig.url. */
   turnCredentialsPath: null,

   /** RTCPeerConfiguration used for audio/video calls. */
   RTCPeerConfig: {
      /** Time-to-live for config from url */
      ttl: 3600,

      /** [optional] If set, jsxc requests and uses RTCPeerConfig from this url */
      url: null,

      /** If true, jsxc send cookies when requesting RTCPeerConfig from the url above */
      withCredentials: false,

      /** ICE servers like defined in http://www.w3.org/TR/webrtc/#idl-def-RTCIceServer */
      iceServers: [{
         urls: 'stun:stun.stunprotocol.org'
      }]
   },

   /** Link to an online user manual */
   onlineHelp: 'http://www.jsxc.org/manual.html',

   viewport: {
      getSize: function() {
         var w = $(window).width() - $('#jsxc_windowListSB').width();
         var h = $(window).height();

         if (jsxc.storage.getUserItem('roster') === 'shown') {
            w -= $('#jsxc_roster').outerWidth(true);
         }

         return {
            width: w,
            height: h
         };
      }
   },

   maxStorableSize: 1000000
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
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.SYS,
            msg: $.t('Received_an_unencrypted_message') + '. [' + d.msg + ']',
            encrypted: d.encrypted,
            forwarded: d.forwarded,
            stamp: d.stamp
         });
      } else {
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.IN,
            msg: d.msg,
            encrypted: d.encrypted,
            forwarded: d.forwarded,
            stamp: d.stamp
         });
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
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('trying_to_start_private_conversation')
               });
               break;
            case OTR.CONST.STATUS_AKE_SUCCESS:
               data.fingerprint = jsxc.otr.objects[bid].their_priv_pk.fingerprint();
               data.msgstate = OTR.CONST.MSGSTATE_ENCRYPTED;

               var msg_state = jsxc.otr.objects[bid].trust ? 'Verified' : 'Unverified';
               var msg = $.t(msg_state + '_private_conversation_started');

               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: 'sys',
                  msg: msg
               });
               break;
            case OTR.CONST.STATUS_END_OTR:
               data.fingerprint = null;

               if (jsxc.otr.objects[bid].msgstate === OTR.CONST.MSGSTATE_PLAINTEXT) {
                  // we abort the private conversation

                  data.msgstate = OTR.CONST.MSGSTATE_PLAINTEXT;
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('private_conversation_aborted')
                  });

               } else {
                  // the buddy abort the private conversation

                  data.msgstate = OTR.CONST.MSGSTATE_FINISHED;
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('your_buddy_closed_the_private_conversation_you_should_do_the_same')
                  });
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
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('Authentication_request_received')
               });

               jsxc.gui.window.smpRequest(bid, data);
               jsxc.storage.setUserItem('smp', bid, {
                  data: data || null
               });

               break;
            case 'trust': // verification completed
               jsxc.otr.objects[bid].trust = data;
               jsxc.storage.updateUserItem('buddy', bid, 'trust', data);
               jsxc.otr.backup(bid);
               jsxc.gui.update(bid);

               if (data) {
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('conversation_is_now_verified')
                  });
               } else {
                  jsxc.gui.window.postMessage({
                     bid: bid,
                     direction: jsxc.Message.SYS,
                     msg: $.t('authentication_failed')
                  });
               }
               jsxc.storage.removeUserItem('smp', bid);
               jsxc.gui.dialog.close('smp');
               break;
            case 'abort':
               jsxc.gui.window.hideOverlay(bid);
               jsxc.gui.window.postMessage({
                  bid: bid,
                  direction: jsxc.Message.SYS,
                  msg: $.t('Authentication_aborted')
               });
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
            jsxc.gui.window.postMessage({
               bid: bid,
               direction: jsxc.Message.SYS,
               msg: '[OTR] ' + $.t(err)
            });
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
         $('#jsxc_dialog > div:eq(2)').find('.jsxc_submit').text($.t('Answer'));
         $('#jsxc_dialog > div:eq(2)').find('.jsxc_explanation').text($.t('onsmp_explanation_question'));
         $('#jsxc_dialog > div:eq(2)').show();
      } else {
         $('#jsxc_dialog > div:eq(3)').find('.jsxc_explanation').text($.t('onsmp_explanation_secret'));
         $('#jsxc_dialog > div:eq(3)').show();
      }

      $('#jsxc_dialog .jsxc_close').click(function() {
         jsxc.storage.removeUserItem('smp', bid);

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
      if (typeof OTR !== 'function') {
         return;
      }

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
         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].sendQueryMsg();
         }
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
         if (jsxc.otr.objects.hasOwnProperty(bid)) {
            jsxc.otr.objects[bid].endOtr.call(jsxc.otr.objects[bid], cb);
            jsxc.otr.objects[bid].init.call(jsxc.otr.objects[bid]);

            jsxc.otr.backup(bid);
         }
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
      var savekey = ['jid', 'our_instance_tag', 'msgstate', 'authstate', 'fragment', 'their_y', 'their_old_y', 'their_keyid', 'their_instance_tag', 'our_dh', 'our_old_dh', 'our_keyid', 'sessKeys', 'storedMgs', 'oldMacKeys', 'trust', 'transmittedRS', 'ssid', 'receivedPlaintext', 'authstate', 'send_interval'];

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

      if (typeof OTR !== 'function') {
         jsxc.warn('OTR support disabled');

         OTR = {};
         OTR.CONST = {
            MSGSTATE_PLAINTEXT: 0,
            MSGSTATE_ENCRYPTED: 1,
            MSGSTATE_FINISHED: 2
         };

         return;
      }

      if (jsxc.storage.getUserItem('key') === null) {
         var msg = $.t('Creating_your_private_key_');
         var worker = null;

         if (Worker) {
            // try to create web-worker

            try {
               worker = new Worker(jsxc.options.root + '/lib/otr/lib/dsa-webworker.js');
            } catch (err) {
               jsxc.warn('Couldn\'t create web-worker.', err);
            }
         }

         jsxc.otr.dsaFallback = (worker === null);

         if (!jsxc.otr.dsaFallback) {
            // create DSA key in background

            worker.onmessage = function(e) {
               var type = e.data.type;
               var val = e.data.val;

               if (type === 'debug') {
                  jsxc.debug(val);
               } else if (type === 'data') {
                  jsxc.otr.DSAready(DSA.parsePrivate(val));
               }
            };

            jsxc.debug('DSA key creation started.');

            // start worker
            worker.postMessage({
               imports: [jsxc.options.root + '/lib/otr/vendor/salsa20.js', jsxc.options.root + '/lib/otr/vendor/bigint.js', jsxc.options.root + '/lib/otr/vendor/crypto.js', jsxc.options.root + '/lib/otr/vendor/eventemitter.js', jsxc.options.root + '/lib/otr/lib/const.js', jsxc.options.root + '/lib/otr/lib/helpers.js', jsxc.options.root + '/lib/otr/lib/dsa.js'],
               seed: BigInt.getSeed(),
               debug: true
            });

         } else {
            // fallback
            jsxc.xmpp.conn.pause();

            jsxc.gui.dialog.open(jsxc.gui.template.get('waitAlert', null, msg), {
               noClose: true
            });

            jsxc.debug('DSA key creation started in fallback mode.');

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

      $.each(jsxc.storage.getUserItem('windowlist') || [], function(index, val) {
         jsxc.otr.create(val);
      });
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
         jsxc.xmpp.conn.resume();
         jsxc.gui.dialog.close();
      }

      jsxc.otr._createDSA();
   },

   enable: function(bid) {
      jsxc.gui.window.get(bid).find('.jsxc_otr').removeClass('jsxc_disabled');
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

      if (uk && !jsxc.bid) {
         console.trace('Unable to create user prefix');
      }

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
      if (jsxc.storageNotConform > 0 && key !== 'rid') {
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

      if (typeof(value) === 'object') {
         // exclude jquery objects, because otherwise safari will fail
         value = JSON.stringify(value, function(key, val) {
            if (!(val instanceof jQuery)) {
               return val;
            }
         });
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
      if (jsxc.storageNotConform && key !== 'rid') {
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

      if (typeof(variable) === 'object') {

         $.each(variable, function(key, val) {
            if (typeof(data[key]) === 'undefined') {
               jsxc.debug('Variable ' + key + ' doesn\'t exist in ' + variable + '. It was created.');
            }

            data[key] = val;
         });
      } else {
         if (typeof(data[variable]) === 'undefined') {
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
      } else if (typeof(item) === 'object' && item !== null) {
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
      if (e.key === jsxc.storage.PREFIX + jsxc.storage.SEP + 'rid') {
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
         } catch (err) {}

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

      if (key.match(/^focus/)) {
         if (jsxc.master) {
            clearTimeout(jsxc.toNotification);
         } else {
            jsxc.hasFocus();
         }
      }

      if (key.match(new RegExp('^history' + jsxc.storage.SEP))) {

         var history = JSON.parse(e.newValue);
         var uid, el, message;

         while (history.length > 0) {
            uid = history.pop();

            message = new jsxc.Message(uid);
            el = message.getDOM();

            if (el.length === 0) {
               if (jsxc.master && message.direction === jsxc.Message.OUT) {
                  jsxc.xmpp.sendMessage(message.bid, message.msg, message._uid);
               }

               jsxc.gui.window._postMessage(message, true);
            } else if (message.isReceived()) {
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
         o = JSON.parse(e.oldValue);

         if (n.minimize !== o.minimize) {
            if (n.minimize) {
               jsxc.gui.window._hide(bid);
            } else {
               jsxc.gui.window._show(bid);
            }
         }

         jsxc.gui.window.setText(bid, n.text);

         if (n.unread !== o.unread) {
            if (n.unread === 0) {
               jsxc.gui.readMsg(bid);
            } else {
               jsxc.gui._unreadMsg(bid, n.unread);
            }
         }

         return;
      }

      if (key.match(/^unreadMsg/) && jsxc.gui.favicon) {
         jsxc.gui.favicon.badge(parseInt(e.newValue) || 0);
      }

      if (key.match(new RegExp('^smp' + jsxc.storage.SEP))) {

         if (!e.newValue) {

            jsxc.gui.dialog.close('smp');
            jsxc.gui.window.hideOverlay(bid);

            if (jsxc.master) {
               jsxc.otr.objects[bid].sm.abort();
            }

            return;
         }

         n = JSON.parse(e.newValue);

         if (typeof(n.data) !== 'undefined') {

            jsxc.gui.window.smpRequest(bid, n.data);

         } else if (jsxc.master && n.sec) {
            jsxc.gui.dialog.close('smp');
            jsxc.gui.window.hideOverlay(bid);

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
         jsxc.gui.roster.toggle(e.newValue);
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

/* global MediaStreamTrack, File */
/* jshint -W020 */

/**
 * WebRTC namespace for jsxc.
 * 
 * @namespace jsxc.webrtc
 */
jsxc.webrtc = {
   /** strophe connection */
   conn: null,

   /** local video stream */
   localStream: null,

   /** remote video stream */
   remoteStream: null,

   /** jid of the last caller */
   last_caller: null,

   /** should we auto accept incoming calls? */
   AUTO_ACCEPT: false,

   /** required disco features for video call */
   reqVideoFeatures: ['urn:xmpp:jingle:apps:rtp:video', 'urn:xmpp:jingle:apps:rtp:audio', 'urn:xmpp:jingle:transports:ice-udp:1', 'urn:xmpp:jingle:apps:dtls:0'],

   /** required disco features for file transfer */
   reqFileFeatures: ['urn:xmpp:jingle:1', 'urn:xmpp:jingle:apps:file-transfer:3'],

   /** bare jid to current jid mapping */
   chatJids: {},

   /**
    * Initialize webrtc plugin.
    * 
    * @private
    * @memberOf jsxc.webrtc
    */
   init: function() {
      var self = jsxc.webrtc;

      // shortcut
      self.conn = jsxc.xmpp.conn;

      if (!self.conn.jingle) {
         jsxc.error('No jingle plugin found!');
         return;
      }

      var manager = self.conn.jingle.manager;

      $(document).on('message.jsxc', self.onMessage);
      $(document).on('presence.jsxc', self.onPresence);

      $(document).on('mediaready.jingle', self.onMediaReady);
      $(document).on('mediafailure.jingle', self.onMediaFailure);

      manager.on('incoming', $.proxy(self.onIncoming, self));

      manager.on('terminated', $.proxy(self.onTerminated, self));
      manager.on('ringing', $.proxy(self.onCallRinging, self));

      manager.on('receivedFile', $.proxy(self.onReceivedFile, self));

      manager.on('sentFile', function(sess, metadata) {
         jsxc.debug('sent ' + metadata.hash);
      });

      manager.on('peerStreamAdded', $.proxy(self.onRemoteStreamAdded, self));
      manager.on('peerStreamRemoved', $.proxy(self.onRemoteStreamRemoved, self));

      manager.on('log:*', function(level, msg) {
         jsxc.debug('[JINGLE][' + level + ']', msg);
      });

      if (self.conn.caps) {
         $(document).on('caps.strophe', self.onCaps);
      }

      var url = jsxc.options.get('RTCPeerConfig').url || jsxc.options.turnCredentialsPath;
      var peerConfig = jsxc.options.get('RTCPeerConfig');

      if (typeof url === 'string' && url.length > 0) {
         self.getTurnCrendentials(url);
      } else {
         if (jsxc.storage.getUserItem('iceValidity')) {
            // old ice validity found. Clean up.
            jsxc.storage.removeUserItem('iceValidity');

            // Replace saved servers with the once passed to jsxc
            peerConfig.iceServers = jsxc.options.RTCPeerConfig.iceServers;
            jsxc.options.set('RTCPeerConfig', peerConfig);
         }

         self.conn.jingle.setICEServers(peerConfig.iceServers);
      }
   },

   onConnected: function() {
      //Request new credentials after login
      jsxc.storage.removeUserItem('iceValidity');
   },

   onDisconnected: function() {
      var self = jsxc.webrtc;

      $(document).off('message.jsxc', self.onMessage);
      $(document).off('presence.jsxc', self.onPresence);

      $(document).off('mediaready.jingle', self.onMediaReady);
      $(document).off('mediafailure.jingle', self.onMediaFailure);

      $(document).off('caps.strophe', self.onCaps);
   },

   /**
    * Checks if cached configuration is valid and if necessary update it.
    * 
    * @memberOf jsxc.webrtc
    * @param {string} [url]
    */
   getTurnCrendentials: function(url) {
      var self = jsxc.webrtc;

      url = url || jsxc.options.get('RTCPeerConfig').url || jsxc.options.turnCredentialsPath;
      var ttl = (jsxc.storage.getUserItem('iceValidity') || 0) - (new Date()).getTime();

      // validity from jsxc < 2.1.0 is invalid
      if (jsxc.storage.getUserItem('iceConfig')) {
         jsxc.storage.removeUserItem('iceConfig');
         ttl = -1;
      }

      if (ttl > 0) {
         // credentials valid

         self.conn.jingle.setICEServers(jsxc.options.get('RTCPeerConfig').iceServers);

         window.setTimeout(jsxc.webrtc.getTurnCrendentials, ttl + 500);
         return;
      }

      $.ajax(url, {
         async: true,
         xhrFields: {
            withCredentials: jsxc.options.get('RTCPeerConfig').withCredentials
         },
         success: function(data) {
            var ttl = data.ttl || 3600;
            var iceServers = data.iceServers;

            if (!iceServers && data.url) {
               // parse deprecated (v2.1.0) syntax
               jsxc.warn('Received RTCPeer configuration is deprecated. Use now RTCPeerConfig.url.');

               iceServers = [{
                  urls: data.url
               }];

               if (data.username) {
                  iceServers[0].username = data.username;
               }

               if (data.credential) {
                  iceServers[0].credential = data.credential;
               }
            }

            if (iceServers && iceServers.length > 0) {
               // url as parameter is deprecated
               var url = iceServers[0].url && iceServers[0].url.length > 0;
               var urls = iceServers[0].urls && iceServers[0].urls.length > 0;

               if (urls || url) {
                  jsxc.debug('ice servers received');

                  var peerConfig = jsxc.options.get('RTCPeerConfig');
                  peerConfig.iceServers = iceServers;
                  jsxc.options.set('RTCPeerConfig', peerConfig);

                  self.conn.jingle.setICEServers(iceServers);

                  jsxc.storage.setUserItem('iceValidity', (new Date()).getTime() + 1000 * ttl);
               } else {
                  jsxc.warn('No valid url found in first ice object.');
               }
            }
         },
         dataType: 'json'
      });
   },

   /**
    * Return list of capable resources.
    * 
    * @memberOf jsxc.webrtc
    * @param jid
    * @param {(string|string[])} features list of required features
    * @returns {Array}
    */
   getCapableRes: function(jid, features) {
      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(jid);
      var res = Object.keys(jsxc.storage.getUserItem('res', bid) || {}) || [];

      if (!features) {
         return res;
      } else if (typeof features === 'string') {
         features = [features];
      }

      var available = [];
      $.each(res, function(i, r) {
         if (self.conn.caps.hasFeatureByJid(bid + '/' + r, features)) {
            available.push(r);
         }
      });

      return available;
   },

   /**
    * Add "video" button to window menu.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param win jQuery window object
    */
   initWindow: function(event, win) {
      var self = jsxc.webrtc;

      if (win.hasClass('jsxc_groupchat')) {
         return;
      }

      jsxc.debug('webrtc.initWindow');

      if (!self.conn) {
         $(document).one('attached.jsxc', function() {
            self.initWindow(null, win);
         });
         return;
      }

      var div = $('<div>').addClass('jsxc_video');
      win.find('.jsxc_tools .jsxc_settings').after(div);

      self.updateIcon(win.data('bid'));
   },

   /**
    * Enable or disable "video" icon and assign full jid.
    * 
    * @memberOf jsxc.webrtc
    * @param bid CSS conform jid
    */
   updateIcon: function(bid) {
      jsxc.debug('Update icon', bid);

      var self = jsxc.webrtc;

      if (bid === jsxc.jidToBid(self.conn.jid)) {
         return;
      }

      var win = jsxc.gui.window.get(bid);
      var jid = win.data('jid');
      var ls = jsxc.storage.getUserItem('buddy', bid);

      if (typeof jid !== 'string') {
         if (ls && typeof ls.jid === 'string') {
            jid = ls.jid;
         } else {
            jsxc.debug('[webrtc] Could not update icon, because could not find jid for ' + bid);
            return;
         }
      }

      var res = Strophe.getResourceFromJid(jid);

      var el = win.find('.jsxc_video');

      var capableRes = self.getCapableRes(jid, self.reqVideoFeatures);
      var targetRes = res;

      if (targetRes === null) {
         $.each(jsxc.storage.getUserItem('buddy', bid).res || [], function(index, val) {
            if (capableRes.indexOf(val) > -1) {
               targetRes = val;
               return false;
            }
         });

         jid = jid + '/' + targetRes;
      }

      el.off('click');

      if (capableRes.indexOf(targetRes) > -1) {
         el.click(function() {
            self.startCall(jid);
         });

         el.removeClass('jsxc_disabled');

         el.attr('title', $.t('Start_video_call'));
      } else {
         el.addClass('jsxc_disabled');

         el.attr('title', $.t('Video_call_not_possible'));
      }

      var fileCapableRes = self.getCapableRes(jid, self.reqFileFeatures);
      var resources = Object.keys(jsxc.storage.getUserItem('res', bid) || {}) || [];

      if (fileCapableRes.indexOf(res) > -1 || (res === null && fileCapableRes.length === 1 && resources.length === 1)) {
         win.find('.jsxc_sendFile').removeClass('jsxc_disabled');
      } else {
         win.find('.jsxc_sendFile').addClass('jsxc_disabled');
      }
   },

   /**
    * Check if full jid changed.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param e
    * @param from full jid
    */
   onMessage: function(e, from) {
      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(from);

      jsxc.debug('webrtc.onmessage', from);

      if (self.chatJids[bid] !== from) {
         self.updateIcon(bid);
         self.chatJids[bid] = from;
      }
   },

   /**
    * Update icon on presence.
    * 
    * @memberOf jsxc.webrtc
    * @param ev
    * @param status
    * @private
    */
   onPresence: function(ev, jid, status, presence) {
      var self = jsxc.webrtc;

      if ($(presence).find('c[xmlns="' + Strophe.NS.CAPS + '"]').length === 0) {
         jsxc.debug('webrtc.onpresence', jid);

         self.updateIcon(jsxc.jidToBid(jid));
      }
   },

   /**
    * Display status message to user.
    * 
    * @memberOf jsxc.webrtc
    * @param txt message
    * @param d duration in ms
    */
   setStatus: function(txt, d) {
      var status = $('.jsxc_webrtc .jsxc_status');
      var duration = (typeof d === 'undefined' || d === null) ? 4000 : d;

      jsxc.debug('[Webrtc]', txt);

      if (status.html()) {
         // attach old messages
         txt = status.html() + '<br />' + txt;
      }

      status.html(txt);

      status.css({
         'margin-left': '-' + (status.width() / 2) + 'px',
         opacity: 0,
         display: 'block'
      });

      status.stop().animate({
         opacity: 1
      });

      clearTimeout(status.data('timeout'));

      if (duration === 0) {
         return;
      }

      var to = setTimeout(function() {
         status.stop().animate({
            opacity: 0
         }, function() {
            status.html('');
         });
      }, duration);

      status.data('timeout', to);
   },

   /**
    * Update "video" button if we receive cap information.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param jid
    */
   onCaps: function(event, jid) {
      var self = jsxc.webrtc;

      if (jsxc.gui.roster.loaded) {
         self.updateIcon(jsxc.jidToBid(jid));
      } else {
         $(document).on('cloaded.roster.jsxc', function() {
            self.updateIcon(jsxc.jidToBid(jid));
         });
      }
   },

   /**
    * Called if video/audio is ready. Open window and display some messages.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param stream
    */
   onMediaReady: function(event, stream) {
      jsxc.debug('media ready');

      var self = jsxc.webrtc;

      self.localStream = stream;
      self.conn.jingle.localStream = stream;

      var dialog = jsxc.gui.showVideoWindow(self.last_caller);

      var audioTracks = stream.getAudioTracks();
      var videoTracks = stream.getVideoTracks();
      var i;

      for (i = 0; i < audioTracks.length; i++) {
         self.setStatus((audioTracks.length > 0) ? $.t('Use_local_audio_device') : $.t('No_local_audio_device'));

         jsxc.debug('using audio device "' + audioTracks[i].label + '"');
      }

      for (i = 0; i < videoTracks.length; i++) {
         self.setStatus((videoTracks.length > 0) ? $.t('Use_local_video_device') : $.t('No_local_video_device'));

         jsxc.debug('using video device "' + videoTracks[i].label + '"');

         dialog.find('.jsxc_localvideo').show();
      }

      $(document).one('cleanup.dialog.jsxc', $.proxy(self.hangUp, self));
      $(document).trigger('finish.mediaready.jsxc');
   },

   /**
    * Called if media failes.
    * 
    * @private
    * @memberOf jsxc.webrtc
    */
   onMediaFailure: function(ev, err) {
      var self = jsxc.webrtc;
      err = err || {
         name: 'Undefined'
      };

      self.setStatus('media failure');

      jsxc.gui.window.postMessage({
         bid: jsxc.jidToBid(jsxc.webrtc.last_caller),
         direction: jsxc.Message.SYS,
         msg: $.t('Media_failure') + ': ' + $.t(err.name) + ' (' + err.name + ').'
      });

      jsxc.debug('media failure: ' + err.name);
   },

   onIncoming: function(session) {
      var self = jsxc.webrtc;
      var type = (session.constructor) ? session.constructor.name : null;

      if (type === 'FileTransferSession') {
         self.onIncomingFileTransfer(session);
      } else if (type === 'MediaSession') {
         self.onIncomingCall(session);
      }
   },

   onIncomingFileTransfer: function(session) {
      jsxc.debug('incoming file transfer from ' + session.peerID);

      var buddylist = jsxc.storage.getUserItem('buddylist') || [];
      var bid = jsxc.jidToBid(session.peerID);

      if (buddylist.indexOf(bid) > -1) {
         //Accept file transfers only from contacts
         session.accept();

         var message = jsxc.gui.window.postMessage({
            _uid: session.sid + ':msg',
            bid: bid,
            direction: jsxc.Message.IN,
            attachment: {
               name: session.receiver.metadata.name,
               type: session.receiver.metadata.type || 'application/octet-stream'
            }
         });

         session.receiver.on('progress', function(sent, size) {
            jsxc.gui.window.updateProgress(message, sent, size);
         });
      }
   },

   /**
    * Called on incoming call.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param sid Session id
    */
   onIncomingCall: function(session) {
      jsxc.debug('incoming call from ' + session.peerID);

      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(session.peerID);

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));

      jsxc.gui.window.postMessage({
         bid: bid,
         direction: jsxc.Message.SYS,
         msg: $.t('Incoming_call')
      });

      // display notification
      jsxc.notification.notify($.t('Incoming_call'), $.t('from_sender', {
         sender: bid
      }));

      // send signal to partner
      session.ring();

      jsxc.webrtc.last_caller = session.peerID;

      if (jsxc.webrtc.AUTO_ACCEPT) {
         self.reqUserMedia();
         return;
      }

      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', bid), {
         noClose: true
      });

      dialog.find('.jsxc_accept').click(function() {
         $(document).trigger('accept.call.jsxc');

         jsxc.switchEvents({
            'mediaready.jingle': function(event, stream) {
               self.setStatus('Accept call');

               session.addStream(stream);

               session.accept();
            },
            'mediafailure.jingle': function() {
               session.decline();
            }
         });

         self.reqUserMedia();
      });

      dialog.find('.jsxc_reject').click(function() {
         jsxc.gui.dialog.close();
         $(document).trigger('reject.call.jsxc');

         session.decline();
      });
   },

   onTerminated: function(session, reason) {
      var self = jsxc.webrtc;
      var type = (session.constructor) ? session.constructor.name : null;

      if (type === 'MediaSession') {
         self.onCallTerminated(session, reason);
      }
   },

   /**
    * Called if call is terminated.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param sid Session id
    * @param reason Reason for termination
    * @param [text] Optional explanation
    */
   onCallTerminated: function(session, reason) {
      this.setStatus('call terminated ' + session.peerID + (reason ? reason.condition : ''));

      var bid = jsxc.jidToBid(session.peerID);

      if (this.localStream) {
         if (typeof this.localStream.stop === 'function') {
            this.localStream.stop();
         } else {
            var tracks = this.localStream.getTracks();
            tracks.forEach(function(track) {
               track.stop();
            });
         }
      }

      if ($('.jsxc_videoContainer').length) {
         $('.jsxc_remotevideo')[0].src = "";
         $('.jsxc_localvideo')[0].src = "";
      }

      this.conn.jingle.localStream = null;
      this.localStream = null;
      this.remoteStream = null;

      jsxc.gui.closeVideoWindow();

      $(document).off('error.jingle');

      jsxc.gui.window.postMessage({
         bid: bid,
         direction: jsxc.Message.SYS,
         msg: ($.t('Call_terminated') + (reason ? (': ' + $.t('jingle_reason_' + reason.condition)) : '') + '.')
      });
   },

   /**
    * Remote station is ringing.
    * 
    * @private
    * @memberOf jsxc.webrtc
    */
   onCallRinging: function() {
      this.setStatus('ringing...', 0);
   },

   /**
    * Called if we receive a remote stream.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param data
    * @param sid Session id
    */
   onRemoteStreamAdded: function(session, stream) {
      this.setStatus('Remote stream for session ' + session.sid + ' added.');

      this.remoteStream = stream;

      var isVideoDevice = stream.getVideoTracks().length > 0;
      var isAudioDevice = stream.getAudioTracks().length > 0;

      this.setStatus(isVideoDevice ? 'Use remote video device.' : 'No remote video device');
      this.setStatus(isAudioDevice ? 'Use remote audio device.' : 'No remote audio device');

      if ($('.jsxc_remotevideo').length) {
         this.attachMediaStream($('#jsxc_webrtc .jsxc_remotevideo'), stream);

         $('#jsxc_webrtc .jsxc_' + (isVideoDevice ? 'remotevideo' : 'noRemoteVideo')).addClass('jsxc_deviceAvailable');
      }
   },

   /**
    * Attach media stream to element.
    * 
    * @memberOf jsxc.webrtc
    * @param element {Element|jQuery}
    * @param stream {mediastream}
    */
   attachMediaStream: function(element, stream) {
      var self = jsxc.webrtc;

      self.conn.jingle.RTC.attachMediaStream((element instanceof jQuery) ? element.get(0) : element, stream);
   },

   /**
    * Called if the remote stream was removed.
    * 
    * @private
    * @meberOf jsxc.webrtc
    * @param event
    * @param data
    * @param sid Session id
    */
   onRemoteStreamRemoved: function(session) {
      this.setStatus('Remote stream for ' + session.jid + ' removed.');

      //TODO clean up
   },

   /**
    * Extracts local and remote ip and display it to the user.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param sid session id
    * @param sess
    */
   onIceConnectionStateChanged: function(session, state) {
      var self = jsxc.webrtc;

      jsxc.debug('connection state for ' + session.sid, state);

      if (state === 'connected') {

         $('#jsxc_webrtc .jsxc_deviceAvailable').show();
         $('#jsxc_webrtc .bubblingG').hide();

      } else if (state === 'failed') {
         jsxc.gui.window.postMessage({
            bid: jsxc.jidToBid(session.peerID),
            direction: jsxc.Message.SYS,
            msg: $.t('ICE_connection_failure')
         });

         session.end('failed-transport');

         $(document).trigger('callterminated.jingle');
      } else if (state === 'interrupted') {
         self.setStatus($.t('Connection_interrupted'));
      }
   },

   /**
    * Start a call to the specified jid.
    * 
    * @memberOf jsxc.webrtc
    * @param jid full jid
    * @param um requested user media
    */
   startCall: function(jid, um) {
      var self = this;

      if (Strophe.getResourceFromJid(jid) === null) {
         jsxc.debug('We need a full jid');
         return;
      }

      self.last_caller = jid;

      jsxc.switchEvents({
         'finish.mediaready.jsxc': function() {
            self.setStatus('Initiate call');

            jsxc.gui.window.postMessage({
               bid: jsxc.jidToBid(jid),
               direction: jsxc.Message.SYS,
               msg: $.t('Call_started')
            });

            $(document).one('error.jingle', function(e, sid, error) {
               if (error && error.source !== 'offer') {
                  return;
               }

               setTimeout(function() {
                  jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
               }, 500);
            });

            var session = self.conn.jingle.initiate(jid);

            session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));
         },
         'mediafailure.jingle': function() {
            jsxc.gui.dialog.close();
         }
      });

      self.reqUserMedia(um);
   },

   /**
    * Hang up the current call.
    * 
    * @memberOf jsxc.webrtc
    */
   hangUp: function(reason, text) {
      if (jsxc.webrtc.conn.jingle.manager && !$.isEmptyObject(jsxc.webrtc.conn.jingle.manager.peers)) {
         jsxc.webrtc.conn.jingle.terminate(null, reason, text);
      } else {
         jsxc.gui.closeVideoWindow();
      }

      // @TODO check event
      $(document).trigger('callterminated.jingle');
   },

   /**
    * Request video and audio from local user.
    * 
    * @memberOf jsxc.webrtc
    */
   reqUserMedia: function(um) {
      if (this.localStream) {
         $(document).trigger('mediaready.jingle', [this.localStream]);
         return;
      }

      um = um || ['video', 'audio'];

      jsxc.gui.dialog.open(jsxc.gui.template.get('allowMediaAccess'), {
         noClose: true
      });
      this.setStatus('please allow access to microphone and camera');

      if (typeof MediaStreamTrack !== 'undefined' && typeof MediaStreamTrack.getSources !== 'undefined') {
         MediaStreamTrack.getSources(function(sourceInfo) {
            var availableDevices = sourceInfo.map(function(el) {

               return el.kind;
            });

            um = um.filter(function(el) {
               return availableDevices.indexOf(el) !== -1;
            });

            jsxc.webrtc.getUserMedia(um);
         });
      } else {
         jsxc.webrtc.getUserMedia(um);
      }
   },

   getUserMedia: function(um) {
      var self = jsxc.webrtc;
      var constraints = {};

      if (um.indexOf('video') > -1) {
         constraints.video = true;
      }

      if (um.indexOf('audio') > -1) {
         constraints.audio = true;
      }

      try {
         self.conn.jingle.RTC.getUserMedia(constraints,
            function(stream) {
               jsxc.debug('onUserMediaSuccess');
               $(document).trigger('mediaready.jingle', [stream]);
            },
            function(error) {
               jsxc.warn('Failed to get access to local media. Error ', error);
               $(document).trigger('mediafailure.jingle', [error]);
            });
      } catch (e) {
         jsxc.error('GUM failed: ', e);
         $(document).trigger('mediafailure.jingle');
      }
   },

   /**
    * Make a snapshot from a video stream and display it.
    * 
    * @memberOf jsxc.webrtc
    * @param video Video stream
    */
   snapshot: function(video) {
      if (!video) {
         jsxc.debug('Missing video element');
      }

      $('.jsxc_snapshotbar p').remove();

      var canvas = $('<canvas/>').css('display', 'none').appendTo('body').attr({
         width: video.width(),
         height: video.height()
      }).get(0);
      var ctx = canvas.getContext('2d');

      ctx.drawImage(video[0], 0, 0);
      var img = $('<img/>');
      var url = null;

      try {
         url = canvas.toDataURL('image/jpeg');
      } catch (err) {
         jsxc.warn('Error', err);
         return;
      }

      img[0].src = url;
      var link = $('<a/>').attr({
         target: '_blank',
         href: url
      });
      link.append(img);
      $('.jsxc_snapshotbar').append(link);

      canvas.remove();
   },

   /**
    * Send file to full jid.
    *
    * @memberOf jsxc.webrtc
    * @param  {string} jid full jid
    * @param  {file} file
    * @return {object} session
    */
   sendFile: function(jid, file) {
      var self = jsxc.webrtc;

      var sess = self.conn.jingle.manager.createFileTransferSession(jid);

      sess.on('change:sessionState', function() {
         jsxc.debug('Session state', sess.state);
      });
      sess.on('change:connectionState', function() {
         jsxc.debug('Connection state', sess.connectionState);
      });

      sess.start(file);

      return sess;
   },

   /**
    * Display received file.
    *
    * @memberOf jsxc.webrtc
    * @param  {object} sess
    * @param  {File} file
    * @param  {object} metadata file metadata
    */
   onReceivedFile: function(sess, file, metadata) {
      jsxc.debug('file received', metadata);

      if (!FileReader) {
         return;
      }

      var reader = new FileReader();
      var type;

      if (!metadata.type) {
         // detect file type via file extension, because XEP-0234 v0.14 
         // does not send any type
         var ext = metadata.name.replace(/.+\.([a-z0-9]+)$/i, '$1').toLowerCase();

         switch (ext) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'svg':
               type = 'image/' + ext.replace(/^jpg$/, 'jpeg');
               break;
            case 'mp3':
            case 'wav':
               type = 'audio/' + ext;
               break;
            case 'pdf':
               type = 'application/pdf';
               break;
            case 'txt':
               type = 'text/' + ext;
               break;
            default:
               type = 'application/octet-stream';
         }
      } else {
         type = metadata.type;
      }

      reader.onload = function(ev) {
         // modify element with uid metadata.actualhash

         jsxc.gui.window.postMessage({
            _uid: sess.sid + ':msg',
            bid: jsxc.jidToBid(sess.peerID),
            direction: jsxc.Message.IN,
            attachment: {
               name: metadata.name,
               type: type,
               size: metadata.size,
               data: ev.target.result
            }
         });
      };

      if (!file.type) {
         // file type should be handled in lib
         file = new File([file], metadata.name, {
            type: type
         });
      }

      reader.readAsDataURL(file);
   }
};

/**
 * Display window for video call.
 * 
 * @memberOf jsxc.gui
 */
jsxc.gui.showVideoWindow = function(jid) {
   var self = jsxc.webrtc;

   // needed to trigger complete.dialog.jsxc
   jsxc.gui.dialog.close();

   $('body').append(jsxc.gui.template.get('videoWindow'));

   // mute own video element to avoid echoes
   $('#jsxc_webrtc .jsxc_localvideo')[0].muted = true;
   $('#jsxc_webrtc .jsxc_localvideo')[0].volume = 0;

   var rv = $('#jsxc_webrtc .jsxc_remotevideo');
   var lv = $('#jsxc_webrtc .jsxc_localvideo');

   lv.draggable({
      containment: "parent"
   });

   if (self.localStream) {
      self.attachMediaStream(lv, self.localStream);
   }

   var w_dialog = $('#jsxc_webrtc').width();
   var w_remote = rv.width();

   // fit in video
   if (w_remote > w_dialog) {
      var scale = w_dialog / w_remote;
      var new_h = rv.height() * scale;
      var new_w = w_dialog;
      var vc = $('#jsxc_webrtc .jsxc_videoContainer');

      rv.height(new_h);
      rv.width(new_w);

      vc.height(new_h);
      vc.width(new_w);

      lv.height(lv.height() * scale);
      lv.width(lv.width() * scale);
   }

   if (self.remoteStream) {
      self.attachMediaStream(rv, self.remoteStream);

      $('#jsxc_webrtc .jsxc_' + (self.remoteStream.getVideoTracks().length > 0 ? 'remotevideo' : 'noRemoteVideo')).addClass('jsxc_deviceAvailable');
   }

   var win = jsxc.gui.window.open(jsxc.jidToBid(jid));

   win.find('.slimScrollDiv').resizable('disable');
   jsxc.gui.window.resize(win, {
      size: {
         width: $('#jsxc_webrtc .jsxc_chatarea').width(),
         height: $('#jsxc_webrtc .jsxc_chatarea').height()
      }
   }, true);

   $('#jsxc_webrtc .jsxc_chatarea ul').append(win.detach());

   $('#jsxc_webrtc .jsxc_hangUp').click(function() {
      jsxc.webrtc.hangUp('success');
   });

   $('#jsxc_webrtc .jsxc_fullscreen').click(function() {

      if ($.support.fullscreen) {
         // Reset position of localvideo
         $(document).one('disabled.fullscreen', function() {
            lv.removeAttr('style');
         });

         $('#jsxc_webrtc .jsxc_videoContainer').fullscreen();
      }
   });

   $('#jsxc_webrtc .jsxc_videoContainer').click(function() {
      $('#jsxc_webrtc .jsxc_controlbar').toggleClass('jsxc_visible');
   });

   return $('#jsxc_webrtc');
};

jsxc.gui.closeVideoWindow = function() {
   var win = $('#jsxc_webrtc .jsxc_chatarea > ul > li');
   $('#jsxc_windowList > ul').prepend(win.detach());
   win.find('.slimScrollDiv').resizable('enable');
   jsxc.gui.window.resize(win);

   $('#jsxc_webrtc').remove();
};

$.extend(jsxc.CONST, {
   KEYCODE_ENTER: 13,
   KEYCODE_ESC: 27
});

$(document).ready(function() {
   $(document).on('init.window.jsxc', jsxc.webrtc.initWindow);
   $(document).on('attached.jsxc', jsxc.webrtc.init);
   $(document).on('disconnected.jsxc', jsxc.webrtc.onDisconnected);
   $(document).on('connected.jsxc', jsxc.webrtc.onConnected);
});

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



jsxc.gui.template['aboutDialog'] = '<h3>JavaScript XMPP Chat</h3>\n' +
'<p>\n' +
'   <b>Version: </b>{{version}}\n' +
'   <br /> <a href="http://jsxc.org/" target="_blank">www.jsxc.org</a>\n' +
'</p>\n' +
'<p>\n' +
'   <i>Released under the MIT license</i>\n' +
'</p>\n' +
'<p>\n' +
'   Real-time chat app for {{app_name}} and more.\n' +
'   <br /> Requires an external <a href="https://xmpp.org/xmpp-software/servers/" target="_blank">XMPP server</a>.\n' +
'</p>\n' +
'<p class="jsxc_credits">\n' +
'   <b>Credits: </b> <a href="http://www.beepzoid.com/old-phones/" target="_blank">David English (Ringtone)</a>,\n' +
'   <a href="https://soundcloud.com/freefilmandgamemusic/ping-1?in=freefilmandgamemusic/sets/free-notification-sounds-and" target="_blank">CameronMusic (Ping)</a>,\n' +
'   <a href="http://www.picol.org/">Picol (Fullscreen icon)</a>, <a href="http://www.jabber.org/">Jabber Software Foundation (Jabber lightbulb logo)</a>\n' +
'</p>\n' +
'<p class="jsxc_libraries">\n' +
'   <b>Libraries: </b>\n' +
'   <a href="http://strophe.im/strophejs/">strophe.js</a> (multiple), <a href="https://github.com/strophe/strophejs-plugins">strophe.js/muc</a> (MIT), <a href="https://github.com/strophe/strophejs-plugins">strophe.js/disco</a> (MIT), <a href="https://github.com/strophe/strophejs-plugins">strophe.js/caps</a> (MIT), <a href="https://github.com/strophe/strophejs-plugins">strophe.js/vcard</a> (MIT), <a href="https://github.com/strophe/strophejs-plugins/tree/master/bookmarks">strophe.js/bookmarks</a> (MIT), <a href="https://github.com/strophe/strophejs-plugins/tree/master/dataforms">strophe.js/x</a> (MIT), <a href="https://github.com/sualko/strophe.jinglejs">strophe.jinglejs</a> (MIT), <a href="https://github.com/neoatlantis/node-salsa20">Salsa20</a> (AGPL3), <a href="www.leemon.com">bigint</a> (public domain), <a href="code.google.com/p/crypto-js">cryptojs</a> (code.google.com/p/crypto-js/wiki/license), <a href="http://git.io/ee">eventemitter</a> (MIT), <a href="https://arlolra.github.io/otr/">otr.js</a> (MPL v2.0), <a href="http://i18next.com/">i18next</a> (MIT), <a href="http://dimsemenov.com/plugins/magnific-popup/">Magnific Popup</a> (MIT), <a href="https://github.com/ejci/favico.js">favico.js</a> (MIT), <a href="http://emojione.com">emoji one</a> (CC-BY 4.0)\n' +
'</p>\n' +
'\n' +
'<button class="btn btn-default pull-right jsxc_debuglog">Show debug log</button>\n' +
'';

jsxc.gui.template['alert'] = '<h3 data-i18n="Alert"></h3>\n' +
'<div class="alert alert-info">\n' +
'   <strong data-i18n="Info"></strong> {{msg}}\n' +
'</div>\n' +
'';

jsxc.gui.template['allowMediaAccess'] = '<p data-i18n="Please_allow_access_to_microphone_and_camera"></p>\n' +
'';

jsxc.gui.template['approveDialog'] = '<h3 data-i18n="Subscription_request"></h3>\n' +
'<p>\n' +
'   <span data-i18n="You_have_a_request_from"></span><b class="jsxc_their_jid"></b>.\n' +
'</p>\n' +
'\n' +
'<button class="btn btn-primary jsxc_approve pull-right" data-i18n="Approve"></button>\n' +
'<button class="btn btn-default jsxc_deny pull-right" data-i18n="Deny"></button>\n' +
'';

jsxc.gui.template['authFailDialog'] = '<h3 data-i18n="Login_failed"></h3>\n' +
'<p data-i18n="Sorry_we_cant_authentikate_"></p>\n' +
'\n' +
'<button class="btn btn-primary jsxc_retry pull-right" data-i18n="Continue_without_chat"></button>\n' +
'<button class="btn btn-default jsxc_cancel pull-right" data-i18n="Retry"></button>\n' +
'';

jsxc.gui.template['authenticationDialog'] = '<h3>Verification</h3>\n' +
'<p data-i18n="Authenticating_a_buddy_helps_"></p>\n' +
'<div>\n' +
'   <p data-i18n="[html]How_do_you_want_to_authenticate_your_buddy"></p>\n' +
'\n' +
'   <div class="btn-group" role="group">\n' +
'      <button class="btn btn-default" data-i18n="Manual"></button>\n' +
'      <button class="btn btn-default" data-i18n="Question"></button>\n' +
'      <button class="btn btn-default" data-i18n="Secret"></button>\n' +
'   </div>\n' +
'</div>\n' +
'<hr />\n' +
'<div style="display: none">\n' +
'   <p data-i18n="To_verify_the_fingerprint_" class="jsxc_explanation"></p>\n' +
'   <p>\n' +
'      <strong data-i18n="Your_fingerprint"></strong>\n' +
'      <br /> <span style="text-transform: uppercase">{{my_priv_fingerprint}}</span>\n' +
'   </p>\n' +
'   <p>\n' +
'      <strong data-i18n="Buddy_fingerprint"></strong>\n' +
'      <br /> <span style="text-transform: uppercase">{{bid_priv_fingerprint}}</span>\n' +
'   </p>\n' +
'   <div class="jsxc_right">\n' +
'      <button class="btn btn-default jsxc_close" data-i18n="Close"></button>\n' +
'      <button class="btn btn-primary jsxc_submit" data-i18n="Compared"></button>\n' +
'   </div>\n' +
'</div>\n' +
'<div style="display: none" class="form-horizontal">\n' +
'   <p data-i18n="To_authenticate_using_a_question_" class="jsxc_explanation"></p>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_quest" data-i18n="Question"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="quest" id="jsxc_quest" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_secret2" data-i18n="Secret"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="secret2" id="jsxc_secret2" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <button class="btn btn-default jsxc_close" data-i18n="Close"></button>\n' +
'         <button class="btn btn-primary jsxc_submit" data-i18n="Ask"></button>\n' +
'      </div>\n' +
'   </div>\n' +
'</div>\n' +
'<div style="display: none" class="form-horizontal">\n' +
'   <p class="jsxc_explanation" data-i18n="To_authenticate_pick_a_secret_"></p>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_secret" data-i18n="Secret"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="secret" id="jsxc_secret" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <button class="btn btn-default jsxc_close" data-i18n="Close"></button>\n' +
'         <button class="btn btn-primary jsxc_submit" data-i18n="Compare"></button>\n' +
'      </div>\n' +
'   </div>\n' +
'</div>\n' +
'';

jsxc.gui.template['bookmarkDialog'] = '<h3 data-i18n="Edit_bookmark"></h3>\n' +
'<form class="form-horizontal">\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_room" data-i18n="Room"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" id="jsxc_room" class="form-control" required="required" readonly="readonly" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_nickname" data-i18n="Nickname"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" disabled="disabled" required="required" name="nickname" id="jsxc_nickname" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <div class="checkbox">\n' +
'            <label>\n' +
'               <input id="jsxc_bookmark" type="checkbox"><span data-i18n="Bookmark"></span>\n' +
'            </label>\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <div class="checkbox disabled">\n' +
'            <label>\n' +
'               <input disabled="disabled" id="jsxc_autojoin" type="checkbox"><span data-i18n="Auto-join"></span>\n' +
'            </label>\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <button type="button" class="btn btn-default jsxc_close" data-i18n="Close"></button>\n' +
'         <button type="submit" class="btn btn-primary jsxc_submit" data-i18n="Save"></button>\n' +
'      </div>\n' +
'   </div>\n' +
'</form>\n' +
'';

jsxc.gui.template['chatWindow'] = '<li class="jsxc_windowItem">\n' +
'   <div class="jsxc_window">\n' +
'      <div class="jsxc_bar">\n' +
'         <div class="jsxc_avatar"></div>\n' +
'         <div class="jsxc_tools">\n' +
'            <div class="jsxc_settings">\n' +
'               <div class="jsxc_more"></div>\n' +
'               <div class="jsxc_inner jsxc_menu">\n' +
'                  <ul>\n' +
'                     <li>\n' +
'                        <a class="jsxc_verification" href="#">\n' +
'                           <span data-i18n="Authentication"></span>\n' +
'                        </a>\n' +
'                     </li>\n' +
'                     <li>\n' +
'                        <a class="jsxc_clear" href="#">\n' +
'                           <span data-i18n="clear_history"></span>\n' +
'                        </a>\n' +
'                     </li>\n' +
'                     <li>\n' +
'                        <a class="jsxc_sendFile" href="#">\n' +
'                           <span data-i18n="Send_file"></span>\n' +
'                        </a>\n' +
'                     </li>\n' +
'                  </ul>\n' +
'               </div>\n' +
'            </div>\n' +
'            <div class="jsxc_close">×</div>\n' +
'         </div>\n' +
'         <div class="jsxc_caption">\n' +
'            <div class="jsxc_name" />\n' +
'            <div class="jsxc_lastmsg">\n' +
'               <span class="jsxc_unread" />\n' +
'               <span class="jsxc_text" />\n' +
'            </div>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="jsxc_fade">\n' +
'         <div class="jsxc_overlay">\n' +
'            <div>\n' +
'               <div class="jsxc_body" />\n' +
'               <div class="jsxc_close" />\n' +
'            </div>\n' +
'         </div>\n' +
'         <div class="jsxc_textarea" />\n' +
'         <div class="jsxc_emoticons">\n' +
'            <div class="jsxc_inner">\n' +
'               <ul>\n' +
'                  <li style="clear:both"></li>\n' +
'               </ul>\n' +
'            </div>\n' +
'         </div>\n' +
'         <div class="jsxc_transfer jsxc_otr jsxc_disabled" />\n' +
'         <input type="text" class="jsxc_textinput" data-i18n="[placeholder]Message" />\n' +
'      </div>\n' +
'   </div>\n' +
'</li>\n' +
'';

jsxc.gui.template['confirmDialog'] = '<p>{{msg}}</p>\n' +
'\n' +
'<button class="btn btn-primary jsxc_confirm pull-right" data-i18n="Confirm"></button>\n' +
'<button class="btn btn-default jsxc_dismiss jsxc_close pull-right" data-i18n="Dismiss"></button>\n' +
'';

jsxc.gui.template['contactDialog'] = '<h3 data-i18n="Add_buddy"></h3>\n' +
'<p class=".jsxc_explanation" data-i18n="Type_in_the_full_username_"></p>\n' +
'<form class="form-horizontal">\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_username" data-i18n="Username"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="username" id="jsxc_username" class="form-control" list="jsxc_userlist" pattern="^[^\\x22&\'\\\\/:<>@\\s]+(@[.\\-_\\w]+)?" required="required" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <datalist id="jsxc_userlist"></datalist>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_alias" data-i18n="Alias"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="alias" id="jsxc_alias" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <button class="btn btn-default jsxc_close" type="button" data-i18n="Close"></button>\n' +
'         <button class="btn btn-primary" type="submit" data-i18n="Add"></button>\n' +
'      </div>\n' +
'   </div>\n' +
'</form>\n' +
'';

jsxc.gui.template['fingerprintsDialog'] = '<div>\n' +
'   <p class="jsxc_maxWidth" data-i18n="A_fingerprint_"></p>\n' +
'   <p>\n' +
'      <strong data-i18n="Your_fingerprint"></strong>\n' +
'      <br /> <span style="text-transform: uppercase">{{my_priv_fingerprint}}</span>\n' +
'   </p>\n' +
'   <p>\n' +
'      <strong data-i18n="Buddy_fingerprint"></strong>\n' +
'      <br /> <span style="text-transform: uppercase">{{bid_priv_fingerprint}}</span>\n' +
'   </p>\n' +
'</div>\n' +
'';

jsxc.gui.template['incomingCall'] = '<h3 data-i18n="Incoming_call"></h3>\n' +
'<p>\n' +
'   <span data-i18n="Do_you_want_to_accept_the_call_from"></span> {{bid_name}}?\n' +
'</p>\n' +
'\n' +
'<button class="btn btn-primary jsxc_accept pull-right" data-i18n="Accept"></button>\n' +
'<button class="btn btn-default jsxc_reject pull-right" data-i18n="Reject"></button>\n' +
'';

jsxc.gui.template['joinChat'] = '<h3 data-i18n="Join_chat"></h3>\n' +
'<p class=".jsxc_explanation" data-i18n="muc_explanation"></p>\n' +
'<div class="form-horizontal">\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_server" data-i18n="Server"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="server" id="jsxc_server" class="form-control" required="required" readonly="readonly" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_room" data-i18n="Room"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="room" id="jsxc_room" class="form-control" autocomplete="off" list="jsxc_roomlist" required="required" pattern="^[^\\x22&\'\\/:<>@\\s]+" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <p class="jsxc_inputinfo jsxc_waiting jsxc_room" data-i18n="Rooms_are_loaded"></p>\n' +
'   <datalist id="jsxc_roomlist">\n' +
'      <p>\n' +
'         <label for="jsxc_roomlist_select"></label>\n' +
'         <select id="jsxc_roomlist_select">\n' +
'            <option></option>\n' +
'            <option>workaround</option>\n' +
'         </select>\n' +
'      </p>\n' +
'   </datalist>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_nickname" data-i18n="Nickname"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="nickname" id="jsxc_nickname" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_password" data-i18n="Password"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="password" id="jsxc_password" class="form-control" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group jsxc_bookmark">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <div class="checkbox">\n' +
'            <label>\n' +
'               <input id="jsxc_bookmark" type="checkbox"><span data-i18n="Bookmark"></span>\n' +
'            </label>\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group jsxc_bookmark">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <div class="checkbox disabled">\n' +
'            <label>\n' +
'               <input disabled="disabled" id="jsxc_autojoin" type="checkbox"><span data-i18n="Auto-join"></span>\n' +
'            </label>\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="jsxc_msg"></div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-8">\n' +
'         <span class="jsxc_warning"></span>\n' +
'         <button class="btn btn-default jsxc_close" data-i18n="Close"></button>\n' +
'         <button class="btn btn-primary jsxc_continue" data-i18n="Continue"></button>\n' +
'         <button class="btn btn-success jsxc_join" data-i18n="Join"></button>\n' +
'      </div>\n' +
'   </div>\n' +
'</div>\n' +
'';

jsxc.gui.template['loginBox'] = '<h3 data-i18n="Login"></h3>\n' +
'<form class="form-horizontal">\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_username" data-i18n="Username"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="text" name="username" id="jsxc_username" class="form-control" required="required" value="{{my_node}}" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="form-group">\n' +
'      <label class="col-sm-4 control-label" for="jsxc_password" data-i18n="Password"></label>\n' +
'      <div class="col-sm-8">\n' +
'         <input type="password" name="password" required="required" class="form-control" id="jsxc_password" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="jsxc_alert jsxc_alert-warning" data-i18n="Sorry_we_cant_authentikate_"></div>\n' +
'   <div class="form-group">\n' +
'      <div class="col-sm-offset-4 col-sm-9">\n' +
'         <button type="reset" class="btn btn-default jsxc_close" name="clear" data-i18n="Cancel" />\n' +
'         <button type="submit" class="btn btn-primary" name="commit" data-i18n="[data-jsxc-loading-text]Connecting...;Connect" />\n' +
'      </div>\n' +
'   </div>\n' +
'</form>\n' +
'';

jsxc.gui.template['pleaseAccept'] = '<p data-i18n="Please_accept_"></p>\n' +
'';

jsxc.gui.template['removeDialog'] = '<h3 data-i18n="Remove_buddy"></h3>\n' +
'<p class="jsxc_maxWidth" data-i18n="[html]You_are_about_to_remove_"></p>\n' +
'\n' +
'<button class="btn btn-primary jsxc_remove pull-right" data-i18n="Remove"></button>\n' +
'<button class="btn btn-default jsxc_cancel jsxc_close pull-right" data-i18n="Cancel"></button>\n' +
'';

jsxc.gui.template['roster'] = '<div id="jsxc_roster">\n' +
'   <ul id="jsxc_buddylist"></ul>\n' +
'   <div class="jsxc_bottom jsxc_presence jsxc_rosteritem" data-bid="own">\n' +
'      <div id="jsxc_avatar" class="jsxc_avatar" />\n' +
'      <div id="jsxc_menu">\n' +
'         <span></span>\n' +
'         <div class="jsxc_inner">\n' +
'            <ul>\n' +
'               <li class="jsxc_settings jsxc_settingsicon" data-i18n="Settings"></li>\n' +
'               <li class="jsxc_muteNotification" data-i18n="Mute"></li>\n' +
'               <li class="jsxc_hideOffline" data-i18n="Hide_offline"></li>\n' +
'               <li class="jsxc_addBuddy jsxc_contacticon" data-i18n="Add_buddy"></li>\n' +
'               <li class="jsxc_onlineHelp jsxc_helpicon" data-i18n="Online_help"></li>\n' +
'               <li class="jsxc_about" data-i18n="About"></li>\n' +
'            </ul>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div id="jsxc_notice">\n' +
'         <span></span>\n' +
'         <div class="jsxc_inner">\n' +
'            <ul></ul>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div id="jsxc_presence">\n' +
'         <span data-i18n="Offline">Offline</span>\n' +
'         <div class="jsxc_inner">\n' +
'            <ul>\n' +
'               <li data-pres="online" class="jsxc_online" data-i18n="Online"></li>\n' +
'               <li data-pres="chat" class="jsxc_chat" data-i18n="Chatty"></li>\n' +
'               <li data-pres="away" class="jsxc_away" data-i18n="Away"></li>\n' +
'               <li data-pres="xa" class="jsxc_xa" data-i18n="Extended_away"></li>\n' +
'               <li data-pres="dnd" class="jsxc_dnd" data-i18n="dnd"></li>\n' +
'               <li data-pres="offline" class="jsxc_offline" data-i18n="Offline"></li>\n' +
'            </ul>\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div id="jsxc_toggleRoster"></div>\n' +
'</div>\n' +
'';

jsxc.gui.template['rosterBuddy'] = '<li class="jsxc_rosteritem">\n' +
'   <div class="jsxc_avatar"></div>\n' +
'   <div class="jsxc_more" />\n' +
'   <div class="jsxc_caption">\n' +
'      <div class="jsxc_name" />\n' +
'      <div class="jsxc_lastmsg">\n' +
'         <span class="jsxc_unread" />\n' +
'         <span class="jsxc_text" />\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="jsxc_menu">\n' +
'      <ul>\n' +
'         <li><a class="jsxc_rename" href="#"><span class="jsxc_icon jsxc_editicon"></span><span data-i18n="rename_buddy"></span></a></li>\n' +
'         <li><a class="jsxc_vcard" href=""><span class="jsxc_icon jsxc_infoicon"></span><span data-i18n="get_info"></span></a></li>\n' +
'         <li><a class="jsxc_delete" href=""><span class="jsxc_icon jsxc_deleteicon"></span><span data-i18n="delete_buddy"></span></a></li>\n' +
'      </ul>\n' +
'   </div>\n' +
'</li>\n' +
'';

jsxc.gui.template['selectionDialog'] = '<h3></h3>\n' +
'<p></p>\n' +
'\n' +
'<button class="btn btn-primary pull-right" data-i18n="Confirm"></button>\n' +
'<button class="btn btn-default pull-right" data-i18n="Dismiss"></button>\n' +
'';

jsxc.gui.template['settings'] = '<form class="form-horizontal col-sm-6">\n' +
'   <fieldset class="jsxc_fieldsetXmpp jsxc_fieldset">\n' +
'      <h3 data-i18n="Login_options"></h3>\n' +
'      <p data-i18n="setting-explanation-xmpp"></p>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="xmpp-url" data-i18n="BOSH_url"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="text" id="xmpp-url" class="form-control" readonly="readonly" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="xmpp-username" data-i18n="Username"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="text" id="xmpp-username" class="form-control" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="xmpp-domain" data-i18n="Domain"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="text" id="xmpp-domain" class="form-control" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="xmpp-resource" data-i18n="Resource"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input class="form-control" type="text" id="xmpp-resource" class="form-control" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-offset-6 col-sm-6">\n' +
'            <button class="btn btn-primary jsxc_continue" type="submit" data-i18n="Save"></button>\n' +
'         </div>\n' +
'      </div>\n' +
'   </fieldset>\n' +
'</form>\n' +
'\n' +
'<form class="form-horizontal col-sm-6">\n' +
'   <fieldset class="jsxc_fieldsetPriority jsxc_fieldset">\n' +
'      <h3 data-i18n="Priority"></h3>\n' +
'      <p data-i18n="setting-explanation-priority"></p>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="priority-online" data-i18n="Online"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="number" value="0" id="priority-online" class="form-control" min="-128" max="127" step="1" required="required" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="priority-chat" data-i18n="Chatty"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="number" value="0" id="priority-chat" class="form-control" min="-128" max="127" step="1" required="required" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="priority-away" data-i18n="Away"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="number" value="0" id="priority-away" class="form-control" min="-128" max="127" step="1" required="required" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="priority-xa" data-i18n="Extended_away"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="number" value="0" id="priority-xa" class="form-control" min="-128" max="127" step="1" required="required" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <label class="col-sm-6 control-label" for="priority-dnd" data-i18n="dnd"></label>\n' +
'         <div class="col-sm-6">\n' +
'            <input type="number" value="0" id="priority-dnd" class="form-control" min="-128" max="127" step="1" required="required" />\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-offset-6 col-sm-6">\n' +
'            <button class="btn btn-primary jsxc_continue" type="submit" data-i18n="Save"></button>\n' +
'         </div>\n' +
'      </div>\n' +
'   </fieldset>\n' +
'</form>\n' +
'\n' +
'<form class="form-horizontal col-sm-6">\n' +
'   <fieldset class="jsxc_fieldsetLoginForm jsxc_fieldset">\n' +
'      <h3 data-i18n="On_login"></h3>\n' +
'      <p data-i18n="setting-explanation-login"></p>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-12">\n' +
'            <div class="checkbox">\n' +
'               <label>\n' +
'                  <input type="checkbox" id="loginForm-enable"><span data-i18n="On_login"></span>\n' +
'               </label>\n' +
'            </div>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-12">\n' +
'            <button class="btn btn-primary jsxc_continue" type="submit" data-i18n="Save"></button>\n' +
'         </div>\n' +
'      </div>\n' +
'   </fieldset>\n' +
'</form>\n' +
'\n' +
'<form class="form-horizontal col-sm-6" data-onsubmit="xmpp.carbons.refresh">\n' +
'   <fieldset class="jsxc_fieldsetCarbons jsxc_fieldset">\n' +
'      <h3 data-i18n="Carbon_copy"></h3>\n' +
'      <p data-i18n="setting-explanation-carbon"></p>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-12">\n' +
'            <div class="checkbox">\n' +
'               <label>\n' +
'                  <input type="checkbox" id="carbons-enable"><span data-i18n="Enable"></span>\n' +
'               </label>\n' +
'            </div>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="form-group">\n' +
'         <div class="col-sm-12">\n' +
'            <button class="btn btn-primary jsxc_continue" type="submit" data-i18n="Save"></button>\n' +
'         </div>\n' +
'      </div>\n' +
'   </fieldset>\n' +
'</form>\n' +
'';

jsxc.gui.template['vCard'] = '<h3>\n' +
'	<span data-i18n="Info_about"></span> <span>{{bid_name}}</span>\n' +
'</h3>\n' +
'<ul class="jsxc_vCard"></ul>\n' +
'<p>\n' +
'   <img src="{{root}}/img/loading.gif" alt="wait" width="32px" height="32px" /> <span data-i18n="Please_wait"></span>...\n' +
'</p>\n' +
'';

jsxc.gui.template['videoWindow'] = '<div id="jsxc_webrtc">\n' +
'   <div class="jsxc_chatarea">\n' +
'      <ul></ul>\n' +
'   </div>\n' +
'   <div class="jsxc_videoContainer">\n' +
'      <video class="jsxc_localvideo" autoplay></video>\n' +
'      <video class="jsxc_remotevideo" autoplay></video>\n' +
'      <div class="jsxc_status"></div>\n' +
'      <div class="bubblingG">\n' +
'         <span id="bubblingG_1"> </span> <span id="bubblingG_2"> </span> <span id="bubblingG_3"> </span>\n' +
'      </div>\n' +
'      <div class="jsxc_noRemoteVideo">\n' +
'         <div>\n' +
'            <div></div>\n' +
'            <p data-i18n="No_video_signal"></p>\n' +
'            <div></div>\n' +
'         </div>\n' +
'      </div>\n' +
'      <div class="jsxc_controlbar jsxc_visible">\n' +
'         <div>\n' +
'            <div class="jsxc_hangUp jsxc_videoControl" />\n' +
'            <div class="jsxc_fullscreen jsxc_videoControl" />\n' +
'         </div>\n' +
'      </div>\n' +
'   </div>\n' +
'   <div class="jsxc_multi">\n' +
'      <div class="jsxc_snapshotbar">\n' +
'         <p>No pictures yet!</p>\n' +
'      </div>\n' +
'      <!--<div class="jsxc_chatarea">\n' +
'                   <ul></ul>\n' +
'               </div>-->\n' +
'      <div class="jsxc_infobar"></div>\n' +
'   </div>\n' +
'</div>\n' +
'';

jsxc.gui.template['waitAlert'] = '<h3>{{msg}}</h3>\n' +
'\n' +
'<div class="progress">\n' +
'   <div class="progress-bar progress-bar-striped active" style="width: 100%" data-i18n="Please_wait">\n' +
'   </div>\n' +
'</div>\n' +
'';

jsxc.gui.template['windowList'] = '<div id="jsxc_windowList">\n' +
'   <ul></ul>\n' +
'</div>\n' +
'<div id="jsxc_windowListSB">\n' +
'   <div class="jsxc_scrollLeft jsxc_disabled">&lt;</div>\n' +
'   <div class="jsxc_scrollRight jsxc_disabled">&gt;</div>\n' +
'</div>\n' +
'';

}(jQuery));