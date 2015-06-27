/* global MediaStreamTrack */
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

   /** required disco features */
   reqVideoFeatures: ['urn:xmpp:jingle:apps:rtp:video', 'urn:xmpp:jingle:apps:rtp:audio', 'urn:xmpp:jingle:transports:ice-udp:1', 'urn:xmpp:jingle:apps:dtls:0'],

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

      manager.on('incoming', $.proxy(self.onCallIncoming, self));
      manager.on('terminated', $.proxy(self.onCallTerminated, self));
      manager.on('ringing', $.proxy(self.onCallRinging, self));

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
    * Return list of video capable resources.
    * 
    * @memberOf jsxc.webrtc
    * @param jid
    * @returns {Array}
    */
   getCapableRes: function(jid) {
      var self = jsxc.webrtc;
      var bid = jsxc.jidToBid(jid);
      var res = jsxc.storage.getUserItem('res', bid) || [];

      var available = [];
      $.each(res, function(r) {
         if (self.conn.caps.hasFeatureByJid(bid + '/' + r, self.reqVideoFeatures)) {
            available.push(r);
         }
      });

      return available;
   },

   /**
    * Add "video" button to roster
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param bid bid of roster item
    * @param data data wich belongs to bid
    * @param el the roster item
    */
   onAddRosterItem: function(event, bid, data, el) {
      var self = jsxc.webrtc;

      if (!self.conn) {
         $(document).one('connectionReady.jsxc', function() {
            self.onAddRosterItem(null, bid, data, el);
         });
         return;
      }

      var videoIcon = $('<div class="jsxc_video jsxc_disabled" title="' + $.t("Start_video_call") + '"></div>');

      videoIcon.click(function() {
         self.startCall(data.jid);
         return false;
      });

      el.find('.jsxc_options.jsxc_left').append(videoIcon);

      el.on('extra.jsxc', function() {
         self.updateIcon(bid);
      });
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
         $(document).one('connectionReady.jsxc', function() {
            self.initWindow(null, win);
         });
         return;
      }

      var div = $('<div>').addClass('jsxc_video');
      win.find('.jsxc_transfer:eq(1)').after(div);

      self.updateIcon(jsxc.jidToBid(win.data('jid')));
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

      var el = win.find('.jsxc_video').add(jsxc.gui.roster.getItem(bid).find('.jsxc_video'));

      var capableRes = self.getCapableRes(jid);
      var targetRes = Strophe.getResourceFromJid(jid);

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

      self.setStatus('media failure');

      jsxc.gui.window.postMessage(jsxc.jidToBid(jsxc.webrtc.last_caller), 'sys', $.t('Media_failure') + ': ' + $.t(err.name) + ' (' + err.name + ').');
      jsxc.debug('media failure: ' + err.name);
   },

   /**
    * Called on incoming call.
    * 
    * @private
    * @memberOf jsxc.webrtc
    * @param event
    * @param sid Session id
    */
   onCallIncoming: function(session) {
      jsxc.debug('incoming call from ' + session.peerID);

      var self = this;
      var bid = jsxc.jidToBid(session.peerID);

      session.on('change:connectionState', $.proxy(self.onIceConnectionStateChanged, self));

      jsxc.gui.window.postMessage(bid, 'sys', $.t('Incoming_call'));

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
      this.setStatus('call terminated ' + session.peer + (reason ? reason.condition : ''));

      var bid = jsxc.jidToBid(session.peer);

      if (this.localStream) {
         this.localStream.stop();
      }

      if ($('.jsxc_videoContainer').length) {
         $('.jsxc_remotevideo')[0].src = "";
         $('.jsxc_localvideo')[0].src = "";
      }

      this.conn.jingle.localStream = null;
      this.localStream = null;
      this.remoteStream = null;

      var win = $('#jsxc_dialog .jsxc_chatarea > ul > li');
      $('#jsxc_windowList > ul').prepend(win.detach());
      win.find('.slimScrollDiv').resizable('enable');

      $(document).off('cleanup.dialog.jsxc');
      $(document).off('error.jingle');
      jsxc.gui.dialog.close();

      jsxc.gui.window.postMessage(bid, 'sys', ($.t('Call_terminated') + (reason ? (': ' + $.t('jingle_reason_' + reason.condition)) : '') + '.'));
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
         this.attachMediaStream($('#jsxc_dialog .jsxc_remotevideo'), stream);

         $('#jsxc_dialog .jsxc_' + (isVideoDevice ? 'remotevideo' : 'noRemoteVideo')).addClass('jsxc_deviceAvailable');
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

      //@TODO clean up
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

         $('#jsxc_dialog .jsxc_deviceAvailable').show();
         $('#jsxc_dialog .bubblingG').hide();

      } else if (state === 'failed') {
         jsxc.gui.window.postMessage(jsxc.jidToBid(session.peerID), 'sys', $.t('ICE_connection_failure'));

         $(document).off('cleanup.dialog.jsxc');

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

            jsxc.gui.window.postMessage(jsxc.jidToBid(jid), 'sys', $.t('Call_started'));

            $(document).one('error.jingle', function(e, sid, error) {
               if (error.source !== 'offer') {
                  return;
               }

               $(document).off('cleanup.dialog.jsxc');
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
      $(document).off('cleanup.dialog.jsxc');

      jsxc.webrtc.conn.jingle.terminate(null, reason, text);
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
   }
};

/**
 * Display window for video call.
 * 
 * @memberOf jsxc.gui
 */
jsxc.gui.showVideoWindow = function(jid) {
   var self = jsxc.webrtc;

   $(document).one('complete.dialog.jsxc', function() {

      // mute own video element to avoid echoes
      $('#jsxc_dialog .jsxc_localvideo')[0].muted = true;
      $('#jsxc_dialog .jsxc_localvideo')[0].volume = 0;

      var rv = $('#jsxc_dialog .jsxc_remotevideo');
      var lv = $('#jsxc_dialog .jsxc_localvideo');

      lv.draggable({
         containment: "parent"
      });

      self.attachMediaStream(lv, self.localStream);

      var w_dialog = $('#jsxc_dialog').width();
      var w_remote = rv.width();

      // fit in video
      if (w_remote > w_dialog) {
         var scale = w_dialog / w_remote;
         var new_h = rv.height() * scale;
         var new_w = w_dialog;
         var vc = $('#jsxc_dialog .jsxc_videoContainer');

         rv.height(new_h);
         rv.width(new_w);

         vc.height(new_h);
         vc.width(new_w);

         lv.height(lv.height() * scale);
         lv.width(lv.width() * scale);
      }

      if (self.remoteStream) {
         self.attachMediaStream(rv, self.remoteStream);

         $('#jsxc_dialog .jsxc_' + (self.remoteStream.getVideoTracks().length > 0 ? 'remotevideo' : 'noRemoteVideo')).addClass('jsxc_deviceAvailable');
      }

      var toggleMulti = function(elem, open) {
         $('#jsxc_dialog .jsxc_multi > div').not(elem).slideUp();

         var opt = {
            complete: jsxc.gui.dialog.resize
         };

         if (open) {
            elem.slideDown(opt);
         } else {
            elem.slideToggle(opt);
         }
      };

      var win = jsxc.gui.window.open(jsxc.jidToBid(jid));

      win.find('.slimScrollDiv').resizable('disable');
      win.find('.jsxc_textarea').slimScroll({
         height: 413
      });
      win.find('.jsxc_emoticons').css('top', (413 + 6) + 'px');

      $('#jsxc_dialog .jsxc_chatarea ul').append(win.detach());

      $('#jsxc_dialog .jsxc_hangUp').click(function() {
         jsxc.webrtc.hangUp('success');
      });

      $('#jsxc_dialog .jsxc_snapshot').click(function() {
         jsxc.webrtc.snapshot(rv);
         toggleMulti($('#jsxc_dialog .jsxc_snapshotbar'), true);
      });

      $('#jsxc_dialog .jsxc_snapshots').click(function() {
         toggleMulti($('#jsxc_dialog .jsxc_snapshotbar'));
      });

      $('#jsxc_dialog .jsxc_showchat').click(function() {
         var chatarea = $('#jsxc_dialog .jsxc_chatarea');

         if (chatarea.is(':hidden')) {
            chatarea.show();
            $('#jsxc_dialog .jsxc_webrtc').width('900');
            jsxc.gui.dialog.resize({
               width: '920px'
            });
         } else {
            chatarea.hide();
            $('#jsxc_dialog .jsxc_webrtc').width('650');
            jsxc.gui.dialog.resize({
               width: '660px'
            });
         }
      });

      $('#jsxc_dialog .jsxc_fullscreen').click(function() {

         if ($.support.fullscreen) {
            // Reset position of localvideo
            $(document).one('disabled.fullscreen', function() {
               lv.removeAttr('style');
            });

            $('#jsxc_dialog .jsxc_videoContainer').fullscreen();
         }
      });

      $('#jsxc_dialog .jsxc_volume').change(function() {
         rv[0].volume = $(this).val();
      });

      $('#jsxc_dialog .jsxc_volume').dblclick(function() {
         $(this).val(0.5);
      });
   });

   // needed to trigger complete.dialog.jsxc
   jsxc.gui.dialog.close();

   return jsxc.gui.dialog.open(jsxc.gui.template.get('videoWindow'), {
      noClose: true
   });
};

$.extend(jsxc.CONST, {
   KEYCODE_ENTER: 13,
   KEYCODE_ESC: 27
});

$(document).ready(function() {
   $(document).on('add.roster.jsxc', jsxc.webrtc.onAddRosterItem);
   $(document).on('init.window.jsxc', jsxc.webrtc.initWindow);
   $(document).on('attached.jsxc', jsxc.webrtc.init);
   $(document).on('disconnected.jsxc', jsxc.webrtc.onDisconnected);
});
