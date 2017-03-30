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

      $(document).on('mediafailure.jingle', self.onMediaFailure);

      manager.on('incoming', $.proxy(self.onIncoming, self));

      // @REVIEW those events could be session based
      manager.on('terminated', $.proxy(self.onTerminated, self));
      manager.on('ringing', $.proxy(self.onCallRinging, self));

      manager.on('receivedFile', $.proxy(self.onReceivedFile, self));
      manager.on('sentFile', function(sess, metadata) {
         jsxc.debug('sent ' + metadata.hash);
      });

      // @REVIEW those events could be session based
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

      // Add video call icon
      var div = $('<div>').addClass('jsxc_video');
      win.find('.jsxc_tools .jsxc_settings').after(div);

      var screenMediaExtension = jsxc.options.get('screenMediaExtension') || {};
      var browserDetails = self.conn.jingle.RTC.browserDetails || {};
      var browser = browserDetails.browser;
      var version = browserDetails.version;
      if (screenMediaExtension[browser] || jsxc.storage.getItem('debug') || (browser === 'firefox' && version >= 52)) {
         // Add screen sharing button if extension is available or we are in debug mode
         var a = $('<a>');
         a.text($.t('Share_screen'));
         a.addClass('jsxc_shareScreen jsxc_video');
         a.attr('href', '#');
         win.find('.jsxc_settings .jsxc_menu li:last').after($('<li>').append(a));
      }

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
            if ($(this).hasClass('jsxc_shareScreen')) {
               self.startScreenSharing(jid);
            } else {
               self.startCall(jid);
            }
         });

         el.removeClass('jsxc_disabled');

         el.attr('title', $.t('Start_video_call'));
      } else {
         el.addClass('jsxc_disabled');

         el.attr('title', $.t('Video_call_not_possible'));
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
    * Called if media failes.
    *
    * @private
    * @memberOf jsxc.webrtc
    */
   onMediaFailure: function(ev, err) {
      var self = jsxc.webrtc;
      var msg;
      err = err || {};

      self.setStatus('media failure');

      switch (err.name) {
         case 'NotAllowedError':
         case 'PERMISSION_DENIED':
            msg = $.t('PermissionDeniedError');
            break;
         case 'HTTPS_REQUIRED':
         case 'EXTENSION_UNAVAILABLE':
            msg = $.t(err.name);
            break;
         default:
            msg = $.t(err.name) !== err.name ? $.t(err.name) : $.t('UNKNOWN_ERROR');
      }

      jsxc.gui.window.postMessage({
         bid: jsxc.jidToBid(jsxc.webrtc.last_caller),
         direction: jsxc.Message.SYS,
         msg: $.t('Media_failure') + ': ' + msg + ' (' + err.name + ').'
      });

      jsxc.gui.dialog.close();

      jsxc.debug('media failure: ' + err.name);
   },

   /**
    * Process incoming jingle offer.
    *
    * @param  {BaseSession} session
    */
   onIncoming: function(session) {
      var self = jsxc.webrtc;
      var type = (session.constructor) ? session.constructor.name : null;

      if (type === 'FileTransferSession') {
         self.onIncomingFileTransfer(session);
      } else if (type === 'MediaSession') {
         var reqMedia = false;

         $.each(session.pc.remoteDescription.contents, function() {
            if (this.senders === 'both') {
               reqMedia = true;
            }
         });

         session.call = reqMedia;

         if (reqMedia) {
            self.onIncomingCall(session);
         } else {
            self.onIncomingStream(session);
         }
      } else {
         jsxc.warn('Unknown session type.');
      }
   },

   /**
    * Process incoming stream offer.
    *
    * @param  {MediaSession} session
    */
   onIncomingStream: function(session) {
      jsxc.debug('incoming stream from ' + session.peerID);

      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(session.peerID);

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));

      self.postScreenMessage(bid, $.t('Incoming_stream'), session.sid);

      // display notification
      jsxc.notification.notify($.t('Incoming_stream'), $.t('from_sender', {
         sender: bid
      }));

      // send signal to partner
      session.ring();

      jsxc.webrtc.last_caller = session.peerID;

      if (jsxc.webrtc.AUTO_ACCEPT) {
         acceptIncomingStream(session);

         return;
      }

      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', bid), {
         noClose: true
      });

      dialog.find('.jsxc_accept').click(function() {
         $(document).trigger('accept.call.jsxc');

         acceptIncomingStream(session);
      });

      dialog.find('.jsxc_reject').click(function() {
         jsxc.gui.dialog.close();
         $(document).trigger('reject.call.jsxc');

         session.decline();
      });

      function acceptIncomingStream(session) {
         jsxc.gui.dialog.close();

         jsxc.gui.showVideoWindow(session.peerID);

         session.accept();
      }
   },

   /**
    * Process incoming file offer.
    *
    * @param  {FileSession} session
    */
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
    * @param {MediaSession} session
    */
   onIncomingCall: function(session) {
      jsxc.debug('incoming call from ' + session.peerID);

      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(session.peerID);

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));

      self.postCallMessage(bid, $.t('Incoming_call'), session.sid);

      // display notification
      jsxc.notification.notify($.t('Incoming_call'), $.t('from_sender', {
         sender: bid
      }));

      // send signal to partner
      session.ring();

      jsxc.webrtc.last_caller = session.peerID;

      if (jsxc.webrtc.AUTO_ACCEPT) {
         self.acceptIncomingCall(session);
         return;
      }

      var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', bid), {
         noClose: true
      });

      dialog.find('.jsxc_accept').click(function() {
         self.acceptIncomingCall(session);
      });

      dialog.find('.jsxc_reject').click(function() {
         jsxc.gui.dialog.close();
         $(document).trigger('reject.call.jsxc');

         session.decline();
      });
   },

   /**
    * Called on incoming call.
    *
    * @private
    * @memberOf jsxc.webrtc
    * @param {MediaSession} session
    */
   acceptIncomingCall: function(session) {
      $(document).trigger('accept.call.jsxc');

      var self = jsxc.webrtc;

      jsxc.switchEvents({
         'mediaready.jingle': function(ev, stream) {
            self.setStatus('Accept call');

            self.localStream = stream;
            self.conn.jingle.localStream = stream;

            var dialog = jsxc.gui.showVideoWindow(session.peerID);
            dialog.find('.jsxc_videoContainer').addClass('jsxc_establishing');

            session.addStream(stream);
            session.accept();
         },
         'mediafailure.jingle': function() {
            session.decline();
         }
      });

      self.reqUserMedia();
   },

   /**
    * Process jingle termination event.
    *
    * @param  {BaseSession} session
    * @param  {Object} reason Reason for termination
    */
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
    * @param {BaseSession} session
    * @param  {Object} reason Reason for termination
    */
   onCallTerminated: function(session, reason) {
      var self = jsxc.webrtc;

      self.setStatus('call terminated ' + session.peerID + (reason && reason.condition ? reason.condition : ''));

      var bid = jsxc.jidToBid(session.peerID);

      if (self.localStream) {
         // stop local stream
         if (typeof self.localStream.getTracks === 'function') {
            var tracks = self.localStream.getTracks();
            tracks.forEach(function(track) {
               track.stop();
            });
         } else if (typeof self.localStream.stop === 'function') {
            self.localStream.stop();
         } else {
            jsxc.warn('Could not stop local stream');
         }
      }

      // @REVIEW necessary?
      if ($('.jsxc_remotevideo').length) {
         $('.jsxc_remotevideo')[0].src = "";
      }

      if ($('.jsxc_localvideo').length) {
         $('.jsxc_localvideo')[0].src = "";
      }

      self.conn.jingle.localStream = null;
      self.localStream = null;
      self.remoteStream = null;

      jsxc.gui.closeVideoWindow();

      // Close incoming call dialog and stop ringing
      jsxc.gui.dialog.close();
      $(document).trigger('reject.call.jsxc');

      $(document).off('error.jingle');

      var msg = (reason && reason.condition ? (': ' + $.t('jingle_reason_' + reason.condition)) : '') + '.';
      if (session.call) {
         msg = $.t('Call_terminated') + msg;
         jsxc.webrtc.postCallMessage(bid, msg, session.sid);
      } else {
         msg = $.t('Stream_terminated') + msg;
         jsxc.webrtc.postScreenMessage(bid, msg, session.sid);
      }
   },

   /**
    * Remote station is ringing.
    *
    * @private
    * @memberOf jsxc.webrtc
    */
   onCallRinging: function() {
      this.setStatus('ringing...', 0);

      $('.jsxc_videoContainer').removeClass('jsxc_establishing').addClass('jsxc_ringing');
   },

   /**
    * Called if we receive a remote stream.
    *
    * @private
    * @memberOf jsxc.webrtc
    * @param {BaseSession} session
    * @param {Object} stream
    */
   onRemoteStreamAdded: function(session, stream) {
      var self = jsxc.webrtc;

      self.setStatus('Remote stream for session ' + session.sid + ' added.');

      self.remoteStream = stream;

      var isVideoDevice = stream.getVideoTracks().length > 0;
      var isAudioDevice = stream.getAudioTracks().length > 0;

      self.setStatus(isVideoDevice ? 'Use remote video device.' : 'No remote video device');
      self.setStatus(isAudioDevice ? 'Use remote audio device.' : 'No remote audio device');

      if ($('.jsxc_remotevideo').length) {
         self.attachMediaStream($('#jsxc_webrtc .jsxc_remotevideo'), stream);

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
      var el = (element instanceof jQuery) ? element.get(0) : element;
      el.srcObject = stream;

      $(element).show();
   },

   /**
    * Called if the remote stream was removed.
    *
    * @private
    * @meberOf jsxc.webrtc
    * @param {BaseSession} session
    */
   onRemoteStreamRemoved: function(session) {
      this.setStatus('Remote stream for ' + session.jid + ' removed.');

      //@TODO clean up
   },

   /**
    * Display information according to the connection state.
    *
    * @private
    * @memberOf jsxc.webrtc
    * @param {BaseSession} session
    * @param {String} state
    */
   onIceConnectionStateChanged: function(session, state) {
      var self = jsxc.webrtc;

      jsxc.debug('connection state for ' + session.sid, state);

      if (state === 'connected') {
         $('#jsxc_webrtc .jsxc_deviceAvailable').show();
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
    * @param {String} jid full jid
    * @param {String[]} um requested user media
    */
   startCall: function(jid, um) {
      var self = jsxc.webrtc;

      if (Strophe.getResourceFromJid(jid) === null) {
         jsxc.debug('We need a full jid');
         return;
      }

      self.last_caller = jid;

      jsxc.switchEvents({
         'mediaready.jingle': function(ev, stream) {
            jsxc.debug('media ready for outgoing call');

            self.initiateOutgoingCall(jid, stream);
         },
         'mediafailure.jingle': function() {
            jsxc.gui.dialog.close();
         }
      });

      self.reqUserMedia(um);
   },

   /**
    * Start jingle session to jid with stream.
    *
    * @param  {String} jid
    * @param  {Object} stream
    */
   initiateOutgoingCall: function(jid, stream) {
      var self = jsxc.webrtc;

      self.localStream = stream;
      self.conn.jingle.localStream = stream;

      var dialog = jsxc.gui.showVideoWindow(jid);

      dialog.find('.jsxc_videoContainer').addClass('jsxc_establishing');

      self.setStatus('Initiate call');

      // @REVIEW session based?
      $(document).one('error.jingle', function(ev, sid, error) {
         if (error && error.source !== 'offer') {
            return;
         }

         setTimeout(function() {
            jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
         }, 500);
      });

      var session = self.conn.jingle.initiate(jid);

      // flag session as call
      session.call = true;

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));

      self.postCallMessage(jsxc.jidToBid(jid), $.t('Call_started'), session.sid);
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
    * Start outgoing screen sharing session.
    *
    * @param  {String} jid
    */
   startScreenSharing: function(jid) {
      var self = this;

      if (Strophe.getResourceFromJid(jid) === null) {
         jsxc.debug('We need a full jid');
         return;
      }

      self.last_caller = jid;

      jsxc.switchEvents({
         'mediaready.jingle': function(ev, stream) {
            self.initiateScreenSharing(jid, stream);
         },
         'mediafailure.jingle': function(ev, err) {
            jsxc.gui.dialog.close();

            var browser = self.conn.jingle.RTC.webrtcDetectedBrowser;

            var screenMediaExtension = jsxc.options.get('screenMediaExtension') || {};
            if (screenMediaExtension[browser] &&
               (err.name === 'EXTENSION_UNAVAILABLE' || (err.name === 'NotAllowedError' && browser === 'firefox'))) {
               // post download link after explanation
               setTimeout(function() {
                  jsxc.gui.window.postMessage({
                     bid: jsxc.jidToBid(jid),
                     direction: jsxc.Message.SYS,
                     msg: $.t('Install_extension') + screenMediaExtension[browser]
                  });
               }, 500);
            }
         }
      });

      self.reqUserMedia(['screen']);
   },

   /**
    * Initiate outgoing (one-way) jingle session to jid with stream.
    *
    * @param  {String} jid
    * @param  {Object} stream
    */
   initiateScreenSharing: function(jid, stream) {
      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(jid);

      jsxc.webrtc.localStream = stream;
      jsxc.webrtc.conn.jingle.localStream = stream;

      var container = jsxc.gui.showMinimizedVideoWindow();
      container.addClass('jsxc_establishing');

      self.setStatus('Initiate stream');

      $(document).one('error.jingle', function(e, sid, error) {
         if (error && error.source !== 'offer') {
            return;
         }

         setTimeout(function() {
            jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
         }, 500);
      });

      var browser = self.conn.jingle.RTC.webrtcDetectedBrowser;
      var browserVersion = self.conn.jingle.RTC.webrtcDetectedVersion;
      var constraints;

      if ((browserVersion < 33 && browser === 'firefox') || browser === 'chrome') {
         constraints = {
            mandatory: {
               'OfferToReceiveAudio': false,
               'OfferToReceiveVideo': false
            }
         };
      } else {
         constraints = {
            'offerToReceiveAudio': false,
            'offerToReceiveVideo': false
         };
      }

      var session = self.conn.jingle.initiate(jid, undefined, constraints);
      session.call = false;

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));
      // @REVIEW also for calls?
      session.on('accepted', function() {
         self.onSessionAccepted(session);
      });

      self.postScreenMessage(bid, $.t('Stream_started'), session.sid);
   },

   /**
    * Session was accepted by other peer.
    *
    * @param  {BaseSession} session
    */
   onSessionAccepted: function(session) {
      var self = jsxc.webrtc;

      $('.jsxc_videoContainer').removeClass('jsxc_ringing');

      self.postScreenMessage(jsxc.jidToBid(session.peerID), $.t('Connection_accepted'), session.sid);
   },

   /**
    * Request media from local user.
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

      if (um.indexOf('screen') >= 0) {
         jsxc.webrtc.getScreenMedia();
      } else if (typeof navigator !== 'undefined' && typeof navigator.mediaDevices !== 'undefined' &&
         typeof navigator.mediaDevices.enumerateDevices !== 'undefined') {
         navigator.mediaDevices.enumerateDevices()
            .then(filterUserMedia)
            .catch(function(err) {
               jsxc.warn(err.name + ": " + err.message);
            });
      } else if (typeof MediaStreamTrack !== 'undefined' && typeof MediaStreamTrack.getSources !== 'undefined') {
         // @deprecated in chrome since v56
         MediaStreamTrack.getSources(filterUserMedia);
      } else {
         jsxc.webrtc.getUserMedia(um);
      }

      function filterUserMedia(devices) {
         var availableDevices = devices.map(function(device) {
            return device.kind;
         });

         um = um.filter(function(el) {
            return availableDevices.indexOf(el) !== -1 || availableDevices.indexOf(el + 'input') !== -1;
         });

         if (um.length) {
            jsxc.webrtc.getUserMedia(um);
         } else {
            jsxc.warn('No audio/video device available.');
         }
      }
   },

   /**
    * Get user media from local browser.
    *
    * @memberOf jsxc.webrtc
    */
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
         self.conn.jingle.getUserMedia(constraints, self.userMediaCallback);
      } catch (e) {
         jsxc.error('GUM failed: ', e);
         $(document).trigger('mediafailure.jingle');
      }
   },

   userMediaCallback: function(err, stream) {
      if (err) {
         jsxc.warn('Failed to get access to local media. Error ', err);
         $(document).trigger('mediafailure.jingle', [err]);
      } else if (stream) {
         jsxc.debug('onUserMediaSuccess');
         $(document).trigger('mediaready.jingle', [stream]);
      }
   },

   /**
    * Get screen media from local browser.
    *
    * @memberOf jsxc.webrtc
    */
   getScreenMedia: function() {
      var self = jsxc.webrtc;

      jsxc.debug('get screen media');

      self.conn.jingle.getScreenMedia(self.screenMediaCallback);
   },

   screenMediaCallback: function(err, stream) {
      if (err) {
         $(document).trigger('mediafailure.jingle', [err]);

         return;
      }

      if (stream) {
         jsxc.debug('onScreenMediaSuccess');
         $(document).trigger('mediaready.jingle', [stream]);
      }
   },

   screenMediaAvailable: function() {
      var self = jsxc.webrtc;
      var browser = self.conn.jingle.RTC.webrtcDetectedBrowser;

      // test if chrome extension for this domain is available
      var chrome = !!sessionStorage.getScreenMediaJSExtensionId && browser === 'chrome';

      // the ff extension from {@link https://github.com/otalk/getScreenMedia}
      // does not provide any possibility to determine if it is installed or not.
      // Starting with Firefox 52 {@link https://www.mozilla.org/en-US/firefox/52.0a2/auroranotes/}
      // no extension is needed anyway.
      var firefox = browser === 'firefox';

      return chrome || firefox;
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
    * Send file to full jid via jingle.
    *
    * @memberOf jsxc.webrtc
    * @param  {string} jid full jid
    * @param  {file} file
    * @return {object} session
    */
   sendFile: function(jid, file) {
      jsxc.debug('Send file via webrtc');

      var self = jsxc.webrtc;

      if (!Strophe.getResourceFromJid(jid)) {
         jsxc.warn('Require full jid to send file via webrtc');

         return;
      }

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

jsxc.webrtc.postCallMessage = function(bid, msg, uid) {
   jsxc.gui.window.postMessage({
      _uid: uid,
      bid: bid,
      direction: jsxc.Message.SYS,
      msg: ':telephone_receiver: ' + msg
   });
};
jsxc.webrtc.postScreenMessage = function(bid, msg, uid) {
   jsxc.gui.window.postMessage({
      _uid: uid,
      bid: bid,
      direction: jsxc.Message.SYS,
      msg: ':computer: ' + msg
   });
};

jsxc.gui.showMinimizedVideoWindow = function() {
   var self = jsxc.webrtc;

   // needed to trigger complete.dialog.jsxc
   jsxc.gui.dialog.close();

   var videoContainer = $('<div/>');
   videoContainer.addClass('jsxc_videoContainer jsxc_minimized');
   videoContainer.appendTo('body');
   videoContainer.draggable({
      containment: "parent"
   });

   var videoElement = $('<video class="jsxc_localvideo" autoplay=""></video>');
   videoElement.appendTo(videoContainer);

   videoElement[0].muted = true;
   videoElement[0].volume = 0;

   if (self.localStream) {
      self.attachMediaStream(videoElement, self.localStream);
   }

   videoContainer.append('<div class="jsxc_controlbar"><div><div class="jsxc_hangUp jsxc_videoControl"></div></div></div></div>');
   videoContainer.find('.jsxc_hangUp').click(function() {
      jsxc.webrtc.hangUp('success');
   });
   videoContainer.click(function() {
      videoContainer.find('.jsxc_controlbar').toggleClass('jsxc_visible');
   });

   return videoContainer;
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

   if (win.length > 0) {
      $('#jsxc_windowList > ul').prepend(win.detach());
      win.find('.slimScrollDiv').resizable('enable');
      jsxc.gui.window.resize(win);
   }

   $('#jsxc_webrtc, .jsxc_videoContainer').remove();
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
