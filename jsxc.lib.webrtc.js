/* global jsxc, Strophe, SDPUtil, getUserMediaWithConstraints, setupRTC, jQuery, MediaStreamTrack */

var RTC = null, RTCPeerconnection = null;

jsxc.gui.template.incomingCall = '<h3>%%Incoming_call%%</h3>\
        <p>%%Do_you_want_to_accept_the_call_from%% {{bid_name}}?</p>\
        <p class="jsxc_right">\
            <a href="#" class="button jsxc_reject">%%Reject%%</a> <a href="#" class="button creation jsxc_accept">%%Accept%%</a>\
         </p>';

jsxc.gui.template.allowMediaAccess = '<p>%%Please_allow_access_to_microphone_and_camera%%</p>';

jsxc.gui.template.videoWindow = '<div class="jsxc_webrtc">\
            <div class="jsxc_chatarea">\
                <ul></ul>\
            </div>\
            <div class="jsxc_videoContainer">\
                <video class="jsxc_localvideo" autoplay></video>\
                <video class="jsxc_remotevideo" autoplay></video>\
                <div class="jsxc_status"></div>\
               <div class="bubblingG">\
                  <span id="bubblingG_1">\
                  </span>\
                  <span id="bubblingG_2">\
                  </span>\
                  <span id="bubblingG_3">\
                  </span>\
               </div>\
                <div class="jsxc_noRemoteVideo">\
                   <div>\
                     <div></div>\
                     <p>%%No_video_signal%%</p>\
                     <div></div>\
                   </div>\
                </div>\
            </div>\
            <div class="jsxc_controlbar">\
                <button type="button" class="jsxc_hangUp">%%hang_up%%</button>\
                <input type="range" class="jsxc_volume" min="0.0" max="1.0" step="0.05" value="0.5" />\
                <div class="jsxc_buttongroup">\
                    <button type="button" class="jsxc_snapshot">%%snapshot%%</button><button type="button" class="jsxc_snapshots">&#9660;</button>\
                </div>\
                <!-- <button type="button" class="jsxc_mute_local">%%mute_my_audio%%</button>\
                <button type="button" class="jsxc_pause_local">%%pause_my_video%%</button> --> \
                <button type="button" class="jsxc_showchat">%%chat%%</button>\
                <button type="button" class="jsxc_fullscreen">%%fullscreen%%</button>\
                <button type="button" class="jsxc_info">%%Info%%</button>\
            </div>\
            <div class="jsxc_multi">\
               <div class="jsxc_snapshotbar">\
                   <p>No pictures yet!</p>\
               </div>\n\
               <!--<div class="jsxc_chatarea">\
                   <ul></ul>\
               </div>-->\
               <div class="jsxc_infobar"></div>\
            </div>\
        </div>';

(function($) {
   "use strict";

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
      reqVideoFeatures: [ 'urn:xmpp:jingle:apps:rtp:video', 'urn:xmpp:jingle:apps:rtp:audio', 'urn:xmpp:jingle:transports:ice-udp:1', 'urn:xmpp:jingle:apps:dtls:0' ],

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

         if (RTC.browser === 'firefox') {
            self.conn.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
         }

         if (!self.conn.jingle) {
            jsxc.error('No jingle plugin found!');
            return;
         }

         // jingle configuration
         self.conn.jingle.PRANSWER = false;
         self.conn.jingle.AUTOACCEPT = false;
         self.conn.jingle.ice_config = jsxc.storage.getUserItem('iceConfig');
         self.conn.jingle.MULTIPARTY = false;
         self.conn.jingle.pc_constraints = RTC.pc_constraints;

         $(document).on('message.jsxc', $.proxy(self.onMessage, self));
         $(document).on('presence.jsxc', $.proxy(self.onPresence, self));

         $(document).on('mediaready.jingle', $.proxy(self.onMediaReady, self));
         $(document).on('mediafailure.jingle', $.proxy(self.onMediaFailure, self));
         $(document).on('callincoming.jingle', $.proxy(self.onCallIncoming, self));
         $(document).on('callterminated.jingle', $.proxy(self.onCallTerminated, self));
         $(document).on('ringing.jingle', $.proxy(self.onCallRinging, self));

         $(document).on('remotestreamadded.jingle', $.proxy(self.onRemoteStreamAdded, self));
         $(document).on('remotestreamremoved.jingle', $.proxy(self.onRemoteStreamRemoved, self));
         $(document).on('iceconnectionstatechange.jingle', $.proxy(self.onIceConnectionStateChanged, self));
         $(document).on('nostuncandidates.jingle', $.proxy(self.noStunCandidates, self));

         $(document).on('error.jingle', function(ev, sid, error) {
            jsxc.error('[JINGLE]', error);
         });

         if (self.conn.disco) {
            self.conn.disco.addFeature('urn:xmpp:jingle:apps:dtls:0');
         }

         if (self.conn.caps) {
            $(document).on('caps.strophe', $.proxy(self.onCaps, self));
         }

         self.getTurnCrendentials();
      },

      /**
       * Checks if cached configuration is valid and if necessary update it.
       * 
       * @memberOf jsxc.webrtc
       */
      getTurnCrendentials: function() {

         if (!jsxc.options.turnCredentialsPath) {
            jsxc.debug('No path for TURN credentials defined!');
            return;
         }

         var ttl = (jsxc.storage.getUserItem('iceValidity') || 0) - (new Date()).getTime();
         if (ttl > 0) {
            // credentials valid

            window.setTimeout(jsxc.webrtc.getTurnCrendentials, ttl + 500);
            return;
         }

         $.ajax(jsxc.options.turnCredentialsPath, {
            async: true,
            success: function(data) {
               var iceConfig = {
                  iceServers: [ {
                     url: 'turn:' + data.url,
                     credential: data.credential,
                     username: data.username
                  } ]
               };

               jsxc.webrtc.conn.jingle.ice_config = iceConfig;
               jsxc.storage.setUserItem('iceConfig', iceConfig);
               jsxc.storage.setUserItem('iceValidity', (new Date()).getTime() + 1000 * data.ttl);
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

         var videoIcon = $('<div class="jsxc_video jsxc_disabled" title="' + jsxc.l.Start_video_call + '"></div>');

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
         var jid = win.data('jid') || jsxc.storage.getUserItem('buddy', bid).jid;

         var el = win.find('.jsxc_video').add(jsxc.gui.roster.getItem(bid).find('.jsxc_video'));

         var capableRes = self.getCapableRes(jid);
         var targetRes = Strophe.getResourceFromJid(jid);

         if (targetRes === null) {
            $.each(jsxc.storage.getUserItem('buddy', bid).res, function(index, val) {
               if (capableRes.indexOf(val) > -1) {
                  targetRes = val;
                  return false;
               }
            });
         }

         el.off('click');

         if (capableRes.indexOf(targetRes) > -1) {
            el.click(function() {
               self.startCall(jid + '/' + targetRes);
            });

            el.removeClass('jsxc_disabled');

            el.attr('title', jsxc.translate('%%Start video call%%'));
         } else {
            el.addClass('jsxc_disabled');

            el.attr('title', jsxc.translate('%%Video call not possible.%%'));
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
      onPresence: function(ev, jid) {
         var self = jsxc.webrtc;

         jsxc.debug('webrtc.onpresence', jid);

         self.updateIcon(jsxc.jidToBid(jid));
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

         self.updateIcon(jsxc.jidToBid(jid));
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

         jsxc.gui.showVideoWindow(self.last_caller);

         var i;
         for (i = 0; i < stream.getAudioTracks().length; i++) {
            self.setStatus((stream.getAudioTracks().length > 0) ? 'Use local audio device.' : 'No local audio device.');

            jsxc.debug('using audio device "' + stream.getAudioTracks()[i].label + '"');
         }
         for (i = 0; i < stream.getVideoTracks().length; i++) {
            self.setStatus((stream.getVideoTracks().length > 0) ? 'Use local video device.' : 'No local video device.');

            jsxc.debug('using video device "' + stream.getVideoTracks()[i].label + '"');
            $('#jsxc_dialog .jsxc_localvideo').show();
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
         this.setStatus('media failure');

         jsxc.gui.window.postMessage(jsxc.jidToBid(jsxc.webrtc.last_caller), 'sys', jsxc.translate('%%Media failure%%: ') + err.name);
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
      onCallIncoming: function(event, sid) {
         jsxc.debug('incoming call' + sid);

         var self = this;
         var sess = this.conn.jingle.sessions[sid];
         var bid = jsxc.jidToBid(sess.peerjid);

         jsxc.gui.window.postMessage(bid, 'sys', jsxc.translate('%%Incoming call.%%'));

         // display notification
         jsxc.notification.notify(jsxc.translate('%%Incoming call%%'), jsxc.translate('%%from%% ' + bid));

         // send signal to partner
         sess.sendRinging();

         jsxc.webrtc.last_caller = sess.peerjid;

         jsxc.switchEvents({
            'mediaready.jingle': function(event, stream) {
               self.setStatus('Accept call');

               sess.localStream = stream;
               sess.peerconnection.addStream(stream);

               sess.sendAnswer();
               sess.accept();
            },
            'mediafailure.jingle': function() {
               sess.sendTerminate('decline');
               sess.terminate();
            }
         });

         if (jsxc.webrtc.AUTO_ACCEPT) {
            self.reqUserMedia();
            return;
         }

         var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', bid), {
            noClose: true
         });

         dialog.find('.jsxc_accept').click(function() {
            $(document).trigger('accept.call.jsxc');

            self.reqUserMedia();
         });

         dialog.find('.jsxc_reject').click(function() {
            jsxc.gui.dialog.close();
            $(document).trigger('reject.call.jsxc');

            sess.sendTerminate('decline');
            sess.terminate();
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
      onCallTerminated: function(event, sid, reason, text) {
         this.setStatus('call terminated ' + sid + (reason ? (': ' + reason + ' ' + text) : ''));

         var bid = jsxc.jidToBid(jsxc.webrtc.last_caller);

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

         jsxc.gui.window.postMessage(bid, 'sys', jsxc.translate('%%Call terminated%%' + (reason ? (': %%' + reason + '%%') : '') + '.'));
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
      onRemoteStreamAdded: function(event, data, sid) {
         this.setStatus('Remote stream for session ' + sid + ' added.');

         var stream = data.stream;
         this.remoteStream = stream;

         var sess = this.conn.jingle.sessions[sid];

         var isVideoDevice = stream.getVideoTracks().length > 0;
         var isAudioDevice = stream.getAudioTracks().length > 0;

         sess.remoteDevices = {
            video: isVideoDevice,
            audio: isAudioDevice
         };

         this.setStatus(isVideoDevice ? 'Use remote video device.' : 'No remote video device');
         this.setStatus(isAudioDevice ? 'Use remote audio device.' : 'No remote audio device');

         if ($('.jsxc_remotevideo').length) {
            RTC.attachMediaStream($('#jsxc_dialog .jsxc_remotevideo'), stream);

            $('#jsxc_dialog .jsxc_' + (isVideoDevice ? 'remotevideo' : 'noRemoteVideo')).addClass('jsxc_deviceAvailable');
         }
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
      onRemoteStreamRemoved: function(event, data, sid) {
         this.setStatus('Remote stream for session ' + sid + ' removed.');
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
      onIceConnectionStateChanged: function(event, sid, sess) {
         var sigState = sess.peerconnection.signalingState;
         var iceCon = sess.peerconnection.iceConnectionState;

         jsxc.debug('iceGat state for ' + sid, sess.peerconnection.iceGatheringState);
         jsxc.debug('iceCon state for ' + sid, iceCon);
         jsxc.debug('sig state for ' + sid, sigState);

         if (sigState === 'stable' && (iceCon === 'connected' || iceCon === 'completed')) {

            $('#jsxc_dialog .jsxc_deviceAvailable').show();
            $('#jsxc_dialog .bubblingG').hide();

            var localSDP = sess.peerconnection.localDescription.sdp;
            var remoteSDP = sess.peerconnection.remoteDescription.sdp;

            sess.local_fp = SDPUtil.parse_fingerprint(SDPUtil.find_line(localSDP, 'a=fingerprint:')).fingerprint;
            sess.remote_fp = SDPUtil.parse_fingerprint(SDPUtil.find_line(remoteSDP, 'a=fingerprint:')).fingerprint;

            var ip_regex = "(\\d{1,3}\\.\\d{1,3}.\\d{1,3}\\.\\d{1,3}) \\d+ typ host";

            sess.remote_ip = remoteSDP.match(new RegExp(ip_regex))[1];
            sess.local_ip = localSDP.match(new RegExp(ip_regex))[1];

            var regex = new RegExp(ip_regex, 'g');
            var match;
            while ((match = regex.exec(remoteSDP)) !== null) {
               if (match[1] !== sess.remote_ip) {
                  alert('!!! WARNING !!!\n\nPossible Man-in-the-middle attack detected!\n\nYou should close the connection.');
                  return;
               }
            }

            var text = '<p>';
            text += '<b>' + jsxc.translate('%%Local IP%%: ') + '</b>' + sess.local_ip + '<br />';
            text += '<b>' + jsxc.translate('%%Remote IP%%: ') + '</b>' + sess.remote_ip + '<br />';
            text += '<b>' + jsxc.translate('%%Local Fingerprint%%: ') + '</b>' + sess.local_fp + '<br />';
            text += '<b>' + jsxc.translate('%%Remote Fingerprint%%: ') + '</b>' + sess.remote_fp;
            text += '</p>';

            $('#jsxc_dialog .jsxc_infobar').html(text);
         } else if (iceCon === 'failed') {
            jsxc.gui.window.postMessage(jsxc.jidToBid(sess.peerjid), 'sys', jsxc.translate('%%ICE connection failure%%.'));

            $(document).off('cleanup.dialog.jsxc');

            sess.sendTerminate('failed-transport');
            sess.terminate();

            $(document).trigger('callterminated.jingle');
         }
      },

      /**
       * No STUN candidates found
       * 
       * @private
       * @memberOf jsxc.webrtc
       */
      noStunCandidates: function() {

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

               jsxc.gui.window.postMessage(jsxc.jidToBid(jid), 'sys', jsxc.translate('%%Call started.%%'));

               $(document).one('error.jingle', function(e, sid, error) {
                  if (error.source !== 'offer') {
                     return;
                  }

                  $(document).off('cleanup.dialog.jsxc');
                  setTimeout(function() {
                     jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
                  }, 500);
               });

               self.conn.jingle.initiate(jid, self.conn.jid.toLowerCase());
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
            $(document).trigger('mediaready.jingle', [ this.localStream ]);
            return;
         }

         um = um || [ 'video', 'audio' ];

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

               getUserMediaWithConstraints(um);
            });
         } else {
            getUserMediaWithConstraints(um);
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

         RTC.attachMediaStream(lv, self.localStream);

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
            RTC.attachMediaStream(rv, self.remoteStream);

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
            jsxc.webrtc.hangUp();
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

         $('#jsxc_dialog .jsxc_info').click(function() {
            toggleMulti($('#jsxc_dialog .jsxc_infobar'));
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

      jsxc.gui.dialog.open(jsxc.gui.template.get('videoWindow'), {
         noClose: true
      });
   };

   $.extend(jsxc.CONST, {
      KEYCODE_ENTER: 13,
      KEYCODE_ESC: 27
   });

   $(document).ready(function() {
      RTC = setupRTC();

      if (RTC !== null) {
         RTCPeerconnection = RTC.peerconnection;

         $(document).on('add.roster.jsxc', jsxc.webrtc.onAddRosterItem);
         $(document).on('init.window.jsxc', jsxc.webrtc.initWindow);
         $(document).on('attached.jsxc', jsxc.webrtc.init);
      }
   });

   $.extend(jsxc.l10n.en, {
      Please_allow_access_to_microphone_and_camera: 'Please click the "Allow" button at the top, to allow access to microphone and camera.',
      Incoming_call: 'Incoming call',
      from: 'from',
      Do_you_want_to_accept_the_call_from: 'Do you want to accept the call from',
      Reject: 'Reject',
      Accept: 'Accept',
      hang_up: 'hang up',
      snapshot: 'snapshot',
      mute_my_audio: 'mute my audio',
      pause_my_video: 'pause my video',
      fullscreen: 'fullscreen',
      Info: 'Info',
      Local_IP: 'Local IP',
      Remote_IP: 'Remote IP',
      Local_Fingerprint: 'Local fingerprint',
      Remote_Fingerprint: 'Remote fingerprint',
      Video_call_not_possible: 'Video call not possible. Your buddy does not support video calls.',
      Start_video_call: 'Start video call'
   });

   $.extend(jsxc.l10n.de, {
      Please_allow_access_to_microphone_and_camera: 'Bitte klick auf den "Zulassen" Button oben, um den Zugriff auf Kamera und Mikrofon zu erlauben.',
      Incoming_call: 'Eingehender Anruf',
      from: 'von',
      Do_you_want_to_accept_the_call_from: 'Möchtest Du den Anruf annehmen von',
      Reject: 'Ablehnen',
      Accept: 'Annehmen',
      hang_up: 'Auflegen',
      snapshot: 'Schnappschuss',
      mute_my_audio: 'Mein Ton aus',
      pause_my_video: 'Mein Video pausieren',
      fullscreen: 'Vollbild',
      Info: 'Info',
      Local_IP: 'Lokale IP',
      Remote_IP: 'Remote IP',
      Local_Fingerprint: 'Lokaler Fingerprint',
      Remote_Fingerprint: 'Remote Fingerprint',
      Video_call_not_possible: 'Videoanruf nicht verfügbar. Dein Gesprächspartner unterstützt keine Videotelefonie.',
      Start_video_call: 'Starte Videoanruf'
   });

   $.extend(jsxc.l10n.es, {
      Please_allow_access_to_microphone_and_camera: 'Por favor, permitir el acceso al micrófono y la cámara.',
      Incoming_call: 'Llamada entrante',
      from: 'de',
      Do_you_want_to_accept_the_call_from: 'Desea aceptar la llamada de',
      Reject: 'Rechazar',
      Accept: 'Aceptar',
      hang_up: 'colgar',
      snapshot: 'instantánea',
      mute_my_audio: 'silenciar mi audio',
      pause_my_video: 'pausar mi vídeo',
      fullscreen: 'pantalla completa',
      Info: 'Info',
      Local_IP: 'IP local',
      Remote_IP: 'IP remota',
      Local_Fingerprint: 'Firma digital local',
      Remote_Fingerprint: 'Firma digital remota',
      Video_call_not_possible: 'Llamada de vídeo no es posible',
      Start_video_call: 'Iniciar llamada de vídeo'
   });
}(jQuery));
