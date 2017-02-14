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
    * @private
    */
   /**
    * Create new connection with given parameters.
    *
    * @name login^2
    * @param {string} jid
    * @param {string} password
    * @memberOf jsxc.xmpp
    * @private
    */
   /**
    * Attach connection with given parameters.
    *
    * @name login^3
    * @param {string} jid
    * @param {string} sid
    * @param {string} rid
    * @memberOf jsxc.xmpp
    * @private
    */
   login: function() {

      if (jsxc.xmpp.conn && jsxc.xmpp.conn.authenticated) {
         jsxc.debug('Connection already authenticated.');
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
               sid = jsxc.options.xmpp.sid || null;
               rid = jsxc.options.xmpp.rid || null;
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

      jsxc.changeState(jsxc.CONST.STATE.ESTABLISHING);

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

      jsxc.triggeredFromElement = (typeof complete === 'boolean') ? complete : true;

      if (!jsxc.master) {
         // instruct master
         jsxc.storage.removeItem('sid');

         // jsxc.xmpp.disconnected is called if master deletes alive after logout
         return true;
      }

      // REVIEW: this should maybe moved to xmpp.disconnected
      // clean up
      jsxc.storage.removeUserItem('buddylist');
      jsxc.storage.removeUserItem('windowlist');
      jsxc.storage.removeUserItem('unreadMsg');

      // Hide dropdown menu
      $('body').click();

      if (!jsxc.xmpp.conn || !jsxc.xmpp.conn.authenticated) {
         return true;
      }

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

      jsxc.changeState(jsxc.CONST.STATE.READY);
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
      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onChatMessage, null, 'message', 'chat');
      jsxc.xmpp.conn.addHandler(jsxc.xmpp.onHeadlineMessage, null, 'message', 'headline');
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
            jsxc.gui.restore();
         }
      }

      jsxc.xmpp.saveSessionParameter();

      jsxc.masterActions();

      jsxc.changeState(jsxc.CONST.STATE.READY);
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
         jsxc.gui.roster.ready = false;
         $('#jsxc_roster').remove();

         // REVIEW: logoutElement without href attribute?
         if (jsxc.triggeredFromLogout) {
            window.location = jsxc.options.logoutElement.attr('href');
         }
      } else {
         jsxc.gui.roster.noConnection();
      }

      window.clearInterval(jsxc.keepaliveInterval);
      jsxc.role_allocation = false;
      jsxc.master = false;
      jsxc.storage.removeItem('alive');

      jsxc.changeState(jsxc.CONST.STATE.SUSPEND);
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
            res: [],
            rnd: Math.random() // force storage event
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
      jsxc.changeUIState(jsxc.CONST.UISTATE.READY);
   },

   /**
    * Triggerd on roster changes
    *
    * @param {dom} iq
    * @returns {Boolean} True to preserve handler
    * @private
    */
   onRosterChanged: function(iq) {

      var iqSender = $(iq).attr('from');
      var ownBareJid = Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid);

      if (iqSender && iqSender !== ownBareJid) {
         return true;
      }

      jsxc.debug('onRosterChanged', iq);

      // @REVIEW there should be only one item, according to RFC6121
      // https://xmpp.org/rfcs/rfc6121.html#roster-syntax-actions-push
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

         //@TODO display error message
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
         jsxc.notice.add({
            msg: $.t('Friendship_request'),
            description: $.t('from') + ' ' + jid,
            type: 'contact'
         }, 'gui.showApproveDialog', [jid]);

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
      } else if (r) {
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

      jsxc.debug('Presence (' + from + '): ' + jsxc.CONST.STATUS[status]);

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
   onChatMessage: function(stanza) {
      var forwarded = $(stanza).find('forwarded[xmlns="' + jsxc.CONST.NS.FORWARD + '"]');
      var message, carbon;
      var originalSender = $(stanza).attr('from');

      if (forwarded.length > 0) {
         message = forwarded.find('> message');
         forwarded = true;
         carbon = $(stanza).find('> [xmlns="' + jsxc.CONST.NS.CARBONS + '"]');

         if (carbon.length === 0) {
            carbon = false;
         } else if (originalSender !== Strophe.getBareJidFromJid(jsxc.xmpp.conn.jid)) {
            // ignore this carbon copy
            return true;
         }

         jsxc.debug('Incoming forwarded message', message);
      } else {
         message = stanza;
         forwarded = false;
         carbon = false;

         jsxc.debug('Incoming message', message);
      }

      var body = $(message).find('body:first').text();
      var htmlBody = $(message).find('body[xmlns="' + Strophe.NS.XHTML + '"]');

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
            jsxc.notice.add({
               msg: $.t('Unknown_sender'),
               description: $.t('You_received_a_message_from_an_unknown_sender') + ' (' + bid + ').'
            }, 'gui.showUnknownSender', [bid]);
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

      var attachment;
      if (htmlBody.length === 1) {
         var httpUploadElement = htmlBody.find('a[data-type][data-name][data-size]');

         if (httpUploadElement.length === 1) {
            attachment = {
               type: httpUploadElement.attr('data-type'),
               name: httpUploadElement.attr('data-name'),
               size: httpUploadElement.attr('data-size'),
            };

            if (httpUploadElement.attr('data-thumbnail') && httpUploadElement.attr('data-thumbnail').match(/^\s*data:[a-z]+\/[a-z0-9-+.*]+;base64,[a-z0-9=+/]+$/i)) {
               attachment.thumbnail = httpUploadElement.attr('data-thumbnail');
            }

            if (httpUploadElement.attr('href') && httpUploadElement.attr('href').match(/^https:\/\//)) {
               attachment.data = httpUploadElement.attr('href');
               body = null;
            }

            if (!attachment.type.match(/^[a-z]+\/[a-z0-9-+.*]+$/i) || !attachment.name.match(/^[\s\w.,-]+$/i) || !attachment.size.match(/^\d+$/i)) {
               attachment = undefined;

               jsxc.warn('Invalid file type, name or size.');
            }
         }
      }

      if (jsxc.otr.objects.hasOwnProperty(bid) && body) {
         // @TODO check for file upload url after decryption
         jsxc.otr.objects[bid].receiveMsg(body, {
            stamp: stamp,
            forwarded: forwarded,
            attachment: attachment
         });
      } else {
         jsxc.gui.window.postMessage({
            bid: bid,
            direction: jsxc.Message.IN,
            msg: body,
            encrypted: false,
            forwarded: forwarded,
            stamp: stamp,
            attachment: attachment
         });
      }

      // preserve handler
      return true;
   },

   /**
    * Process message stanzas of type headline.
    *
    * @param  {String} stanza Message stanza of type headline
    * @return {Boolean}
    */
   onHeadlineMessage: function(stanza) {
      stanza = $(stanza);

      var from = stanza.attr('from');
      var domain = Strophe.getDomainFromJid(from);

      if (domain !== from) {
         if (!jsxc.storage.getUserItem('buddy', jsxc.jidToBid(from))) {
            return true;
         }
      } else if (domain !== Strophe.getDomainFromJid(jsxc.xmpp.conn.jid)) {
         return true;
      }

      var subject = stanza.find('subject:first').text() || $.t('Notification');
      var body = stanza.find('body:first').text();

      jsxc.notice.add({
         msg: subject,
         description: body,
         type: (domain === from) ? 'announcement' : null
      }, 'gui.showNotification', [subject, body, from]);

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
   sendMessage: function(message) {
      var bid = message.bid;
      var msg = message.htmlMsg;

      var mucRoomNames = (jsxc.xmpp.conn.muc && jsxc.xmpp.conn.muc.roomNames) ? jsxc.xmpp.conn.muc.roomNames : [];
      var isMucBid = mucRoomNames.indexOf(bid) >= 0;

      if (jsxc.otr.objects.hasOwnProperty(bid) && !isMucBid) {
         jsxc.otr.objects[bid].sendMsg(msg, message);
      } else {
         jsxc.xmpp._sendMessage(jsxc.gui.window.get(bid).data('jid'), msg, message);
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
   _sendMessage: function(jid, msg, message) {
      // @TODO put jid into message object
      var data = jsxc.storage.getUserItem('buddy', jsxc.jidToBid(jid)) || {};
      var isBar = (Strophe.getBareJidFromJid(jid) === jid);
      var type = data.type || 'chat';
      message = message || {};

      var xmlMsg = $msg({
         to: jid,
         type: type,
         id: message._uid
      });

      if (message.type === jsxc.Message.HTML) {
         xmlMsg.c("html", {
            xmlns: Strophe.NS.XHTML_IM
         });

         // Omit StropheJS XEP-0071 limitations
         var body = Strophe.xmlElement("body", {
            xmlns: Strophe.NS.XHTML
         });
         body.innerHTML = msg;

         xmlMsg.node.appendChild(body);
      } else {
         xmlMsg.c('body').t(msg);
      }

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

      if (jsxc.xmpp.conn.chatstates && !jsxc.xmpp.chatState.isDisabled()) {
         // send active event (XEP-0085)
         xmlMsg.up().c('active', {
            xmlns: Strophe.NS.CHATSTATES
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
