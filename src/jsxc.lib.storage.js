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
         jsxc.warn('Unable to create user prefix');
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

      // Workaround for non-conforming browser
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
    * @param {String} type variable type (a prefix)
    * @param {String} key variable name
    * @param {String|object} variable variable name in object or object with
    *        variable/key pairs
    * @param {Object} [value] value (not used if the variable was an object)
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
    * Increments value
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
    * @param {event} e Storage event
    * @param {String} e.key Key name which triggered event
    * @param {Object} e.oldValue Old Value for key
    * @param {Object} e.newValue New Value for key
    * @param {String} e.url
    */
   onStorage: function(e) {

      // skip
      if (e.key === jsxc.storage.PREFIX + jsxc.storage.SEP + 'rid' || !e.key) {
         return;
      }

      var re = new RegExp('^' + jsxc.storage.PREFIX + jsxc.storage.SEP + '(?:[^' + jsxc.storage.SEP + ']+@[^' + jsxc.storage.SEP + ']+' + jsxc.storage.SEP + ')?(.*)', 'i');
      var key = e.key.replace(re, '$1');

      // Workaround for non-conforming browser, which trigger
      // events on every page (notably IE): Ignore own writes
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

      // Workaround for non-conforming browser
      if (e.oldValue === e.newValue) {
         return;
      }

      var n, o;
      var bid = key.replace(new RegExp('[^' + jsxc.storage.SEP + ']+' + jsxc.storage.SEP + '(.*)', 'i'), '$1');

      // react if someone asks whether there is a master
      if (jsxc.master && key === 'alive') {
         jsxc.debug('Master request.');

         if (e.newValue && e.newValue.match(/:master$/)) {
            jsxc.warn('Master request from master. Something went wrong... :-(');
            return;
         }

         jsxc.keepAlive();
         return;
      }

      // master alive
      if (!jsxc.master && (key === 'alive' || key === 'alive_busy')) {

         // reset timeouts
         jsxc.to = $.grep(jsxc.to, function(timeout) {
            window.clearTimeout(timeout);

            return false;
         });

         if (typeof e.newValue === 'undefined' || e.newValue === null) {
            jsxc.xmpp.disconnected();
            return;
         }

         jsxc.to.push(window.setTimeout(jsxc.checkMaster, ((key === 'alive') ? jsxc.options.timeout : jsxc.options.busyTimeout) + jsxc.random(60)));

         // only call the first time
         if (!jsxc.role_allocation) {
            jsxc.onSlave();
         }

         return;
      }

      if (jsxc.master && key === 'sid' && !e.newValue) {
         jsxc.xmpp.logout(false);
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
         if (jsxc.gui.roster.getItem(bid).length === 0) {
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

      if (key === '_cmd' && e.newValue) {
         n = JSON.parse(e.newValue) || {};
         jsxc.storage.removeUserItem('_cmd');

         if (n.cmd && n.target === jsxc.tab.CONST[jsxc.master ? 'MASTER' : 'SLAVE']) {
            jsxc.debug('Execute tab cmd: ' + n.cmd);

            jsxc.exec(n.cmd, n.params);
         }
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
