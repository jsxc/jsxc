/**
 * Copyright (c) 2013 Klaus Herberth <klaus@jsxc.org> <br>
 * Released under the MIT license
 * 
 * @file WebRTC Plugin for the javascript xmpp client
 * @author Klaus Herberth
 * @version 0.4.3
 */

/* jsxc, Strophe, SDPUtil, getUserMediaWithConstraints, setupRTC, jQuery */

var RTC = null, RTCPeerconnection = null;

jsxc.gui.template.incomingCall = '<h3>%%Incoming_call%%</h3>\
        <p>%%Do_you_want_to_accept_the_call_from%% {{cid_name}}?</p>\
        <p class="jsxc_right">\
            <a href="#" class="button jsxc_reject">%%Reject%%</a> <a href="#" class="button creation jsxc_accept">%%Accept%%</a>\
         </p>';

jsxc.gui.template.allowMediaAccess = '<p>%%Please_allow_access_to_microphone_and_camera%%</p>';

jsxc.gui.template.videoWindow = '<div class="jsxc_webrtc">\
            <div class="jsxc_videoContainer">\
                <video class="jsxc_localvideo" autoplay></video>\
                <video class="jsxc_remotevideo" autoplay></video>\
                <div class="jsxc_status"></div>\
            </div>\
            <div class="jsxc_controlbar">\
                <button type="button" class="jsxc_hangUp">%%hang_up%%</button>\
                <input type="range" class="jsxc_volume" min="0.0" max="1.0" step="0.05" value="0.5" />\
                <div class="jsxc_buttongroup">\
                    <button type="button" class="jsxc_snapshot">%%snapshot%%</button><button type="button" class="jsxc_snapshots">&#9660;</button>\
                </div>\
                <!-- <button type="button" class="jsxc_mute_local">%%mute_my_audio%%</button>\
                <button type="button" class="jsxc_pause_local">%%pause_my_video%%</button> --> \
                <button type="button" class="jsxc_chat">%%chat%%</button>\
                <button type="button" class="jsxc_fullscreen">%%fullscreen%%</button>\
                <button type="button" class="jsxc_info">%%Info%%</button>\
            </div>\
            <div class="jsxc_multi">\
               <div class="jsxc_snapshotbar">\
                   <p>No pictures yet!</p>\
               </div>\n\
               <div class="jsxc_chatarea">\
                   <ul></ul>\
               </div>\
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
      reqVideoFeatures: [ 'urn:xmpp:jingle:apps:rtp:video', 'urn:xmpp:jingle:apps:rtp:audio', 'urn:xmpp:jingle:transports:ice-udp:1' ],

      /** bare jid to current jid mapping */
      chatJids: {},

      /**
       * Initialize webrtc plugin.
       * 
       * @private
       * @memberOf jsxc.webrtc
       */
      init: function() {

         // shortcut
         this.conn = jsxc.xmpp.conn;

         if (RTC.browser === 'firefox') {
            this.conn.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
         }

         if (!this.conn.jingle) {
            jsxc.error('No jingle plugin found!');
            return;
         }

         // jingle configuration
         this.conn.jingle.PRANSWER = false;
         this.conn.jingle.AUTOACCEPT = false;
         this.conn.jingle.ice_config = jsxc.storage.getUserItem('iceConfig');
         this.conn.jingle.MULTIPARTY = false;
         this.conn.jingle.pc_constraints = RTC.pc_constraints;

         $(document).on('message.jsxc', $.proxy(this.onMessage, this));

         $(document).on('mediaready.jingle', $.proxy(this.onMediaReady, this));
         $(document).on('mediafailure.jingle', $.proxy(this.onMediaFailure, this));
         $(document).on('callincoming.jingle', $.proxy(this.onCallIncoming, this));
         $(document).on('callterminated.jingle', $.proxy(this.onCallTerminated, this));
         $(document).on('ringing.jingle', $.proxy(this.onCallRinging, this));

         $(document).on('remotestreamadded.jingle', $.proxy(this.onRemoteStreamAdded, this));
         $(document).on('remotestreamremoved.jingle', $.proxy(this.onRemoteStreamRemoved, this));
         $(document).on('iceconnectionstatechange.jingle', $.proxy(this.onIceConnectionStateChanged, this));
         $(document).on('nostuncandidates.jingle', $.proxy(this.noStunCandidates, this));

         if (this.conn.caps) {
            $(document).on('caps.strophe', $.proxy(this.onCaps, this));
         }

         this.getTurnCrendentials();
      },

      /**
       * Checks if cached configuration is valid and if necessary update it.
       * 
       * @memberOf jsxc.webrtc
       */
      getTurnCrendentials: function() {

         if (!jsxc.options.turnCredentialsPath) {
            jsxc.warn('No path for TURN credentials defined!');
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
            }
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

         if (!self.conn) {
            $(document).one('connectionReady.jsxc', function() {
               self.initWindow(null, win);
            });
            return;
         }

         var li = $('<li>Video</li>').addClass('jsxc_video');
         win.find('.jsxc_settings ul').append(li);

         self.updateWindow(win);
      },

      /**
       * Enable or disable "video" button and assign full jid.
       * 
       * @memberOf jsxc.webrtc
       * @param win jQuery window object
       */
      updateWindow: function(win) {
         if (!win || win.length === 0) {
            return;
         }

         var self = jsxc.webrtc;
         var jid = win.data('jid');
         var li = win.find('.jsxc_video');

         // only start video call to a full jid
         if (Strophe.getResourceFromJid(jid) === null) {
            var cid = jsxc.jidToCid(jid);
            var res = jsxc.storage.getUserItem('buddy_' + cid).res;

            if (Array.isArray(res) && res.length === 1) {
               jid += '/' + res[0];
            }
         }

         li.off('click');

         if (self.conn.caps.hasFeatureByJid(jid, self.reqVideoFeatures)) {
            li.click(function() {
               self.startCall(jid);
            });
            li.removeClass('jsxc_disabled');
         } else {
            li.addClass('jsxc_disabled');
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
         var bJid = Strophe.getBareJidFromJid(from);

         if (self.chatJids[bJid] !== from) {
            self.updateWindow(jsxc.gui.getWindow(jsxc.jidToCid(bJid)));
            self.chatJids[bJid] = from;
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
            console.log('return');
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
         var win = jsxc.gui.getWindow(jsxc.jidToCid(jid));

         if (win.length > 0) {
            self.updateWindow(win);
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

         jsxc.gui.showVideoWindow(self.last_caller);

         var i;
         for (i = 0; i < stream.getAudioTracks().length; i++) {
            self.setStatus((stream.getAudioTracks().length > 0) ? 'Use local audio device.' : 'No local audio device.');

            jsxc.debug('using audio device "' + stream.getAudioTracks()[i].label + '"');
         }
         for (i = 0; i < stream.getVideoTracks().length; i++) {
            self.setStatus((stream.getVideoTracks().length > 0) ? 'Use local video device.' : 'No local video device.');

            jsxc.debug('using video device "' + stream.getVideoTracks()[i].label + '"');
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
      onMediaFailure: function() {
         this.setStatus('media failure');
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
         var jid = jsxc.jidToCid(sess.peerjid);

         // display notification
         jsxc.notification.notify(jsxc.translate('%%Incoming call%%'), jsxc.translate('%%from%% ' + jid));

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

         var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', jsxc.jidToCid(jid)));

         dialog.find('.jsxc_accept').click(function() {
            self.reqUserMedia();
         });

         dialog.find('.jsxc_reject').click(function() {
            jsxc.gui.dialog.close();

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

         if (this.localStream) {
            this.localStream.stop();
         }

         $('.jsxc_remotevideo')[0].src = "";
         $('.jsxc_localvideo')[0].src = "";

         this.conn.jingle.localStream = null;
         this.localStream = null;
         this.remoteStream = null;

         $(document).off('cleanup.dialog.jsxc');
         $(document).off('error.jingle');
         jsxc.gui.dialog.close();
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
         jsxc.debug('Stream data', data);

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
            RTC.attachMediaStream($('.jsxc_remotevideo'), stream);
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

         if (sigState === 'stable' && iceCon === 'connected') {
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
       */
      startCall: function(jid) {
         var self = this;

         if (Strophe.getResourceFromJid(jid) === null) {
            jsxc.debug('We need a full jid');
            return;
         }

         self.last_caller = jid;

         jsxc.switchEvents({
            'finish.mediaready.jsxc': function() {
               self.setStatus('Initiate call');

               $(document).one('error.jingle', function(e, sid, error) {
                  if (error.source !== 'offer') {
                     return;
                  }

                  self.conn.jingle.terminate(null, 'init fail');

                  $(document).off('cleanup.dialog.jsxc');
                  setTimeout(function() {
                     jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
                  }, 500);
               });

               self.conn.jingle.initiate(jid, self.conn.jid.toLowerCase());
            },
            'mediafailure.jingle': function() {

            }
         });

         this.reqUserMedia();
      },

      /**
       * Hang up the current call.
       * 
       * @memberOf jsxc.webrtc
       */
      hangUp: function() {
         $(document).off('cleanup.dialog.jsxc');

         jsxc.webrtc.conn.jingle.terminate(null);
         $(document).trigger('callterminated.jingle');
      },

      /**
       * Request video and audio from local user.
       * 
       * @memberOf jsxc.webrtc
       */
      reqUserMedia: function() {
         if (this.localStream) {
            $(document).trigger('mediaready.jingle', [ this.localStream ]);
            return;
         }

         jsxc.gui.dialog.open(jsxc.gui.template.get('allowMediaAccess'), {
            noClose: true
         });
         this.setStatus('please allow access to microphone and camera');

         getUserMediaWithConstraints([ 'video', 'audio' ]);
      },

      /**
       * Make a snapshot from a video stream and display it.
       * 
       * @memberOf
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
         var url = canvas.toDataURL('image/jpeg');
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

         var win = jsxc.gui.window.open(jsxc.jidToCid(jid));
         var winId = win.attr('id');
         $('#jsxc_dialog .jsxc_chatarea ul').append(win.detach());

         $('#jsxc_dialog .jsxc_hangUp').click(function() {
            $('#jsxc_windowList > ul').prepend($('#' + winId).detach());
            jsxc.webrtc.hangUp();
         });

         $('#jsxc_dialog .jsxc_snapshot').click(function() {
            jsxc.webrtc.snapshot(rv);
            toggleMulti($('#jsxc_dialog .jsxc_snapshotbar'), true);
         });

         $('#jsxc_dialog .jsxc_snapshots').click(function() {
            toggleMulti($('#jsxc_dialog .jsxc_snapshotbar'));
         });

         $('#jsxc_dialog .jsxc_chat').click(function() {
            toggleMulti($('#jsxc_dialog .jsxc_chatarea'));
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

         $(document).on('init.window.jsxc', jsxc.webrtc.initWindow);

         var init = function() {
            jsxc.webrtc.init();
         };

         jsxc.switchEvents({
            'connected': init,
            'attached': init
         });
      }
   });
}(jQuery));