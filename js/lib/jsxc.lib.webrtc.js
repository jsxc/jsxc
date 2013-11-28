/**
 * Copyright (c) 2013 Klaus Herberth <klaus@jsxc.org>
 * Released under the MIT license
 *
 * @file WebRTC Plugin for the javascript xmpp client
 * @author Klaus Herberth
 * @version 0.3
 */

/*global jsxc, Strophe, SDPUtil, getUserMediaWithConstraints, setupRTC, jQuery*/

var RTC = null,
        RTCPeerconnection = null;

jsxc.gui.template.incomingCall =
        '<h3>%%Incoming_call%%</h3>\n\
        <p>%%Do_you_want_to_accept_the_call_from%% %%cid_name%%?</p>\n\
        <p class="jsxc_right">\n\
            <a href="#" class="button jsxc_reject">%%Reject%%</a> <a href="#" class="button creation jsxc_accept">%%Accept%%</a>\n\
         </p>';

jsxc.gui.template.allowAccess =
        '<p>%%Please_allow_access_to_microphone_and_camera%%</p>';

jsxc.gui.template.videoWindow =
        '<div class="jsxc_webrtc">\n\
            <div class="jsxc_videoContainer">\n\
                <video class="jsxc_localvideo" autoplay></video>\n\
                <video class="jsxc_remotevideo" autoplay></video>\n\
                <div class="jsxc_status"></div>\n\
            </div>\n\
            <div class="jsxc_controlbar">\n\
                <button type="button" class="jsxc_hangUp">%%hang_up%%</button>\n\
                <input type="range" class="jsxc_volume" min="0.0" max="1.0" step="0.05" value="0.5" />\n\
                <div class="jsxc_buttongroup">\n\
                    <button type="button" class="jsxc_snapshot">%%snapshot%%</button><button type="button" class="jsxc_snapshots">&#9660;</button>\n\
                </div>\n\
                <!-- <button type="button" class="jsxc_mute_local">%%mute_my_audio%%</button>\n\
                <button type="button" class="jsxc_pause_local">%%pause_my_video%%</button> --> \n\
                <button type="button" class="jsxc_chat">%%chat%%</button>\n\
                <button type="button" class="jsxc_fullscreen">%%fullscreen%%</button>\n\
                <button type="button" class="jsxc_info">%%Info%%</button>\n\
            </div>\n\
            <div class="jsxc_snapshotbar">\n\
                <p>No pictures yet!</p>\n\
            </div>\n\
            <div class="jsxc_chatarea">\n\
                <ul></ul>\n\
            </div>\n\
            <div class="jsxc_infobar"></div>\n\
        </div>';

(function ($) {
   "use strict";
   jsxc.webrtc = {
      conn: null,
      localStream: null,
      remoteStream: null,
      last_caller: null,
      AUTO_ACCEPT: true,
      reqVideoFeatures: [
         'urn:xmpp:jingle:apps:rtp:video',
         'urn:xmpp:jingle:apps:rtp:audio',
         'urn:xmpp:jingle:transports:ice-udp:1'
      ],
      chatJids: {
      },
      init: function () {

         //shortcut
         this.conn = jsxc.xmpp.conn;

         if (RTC.browser === 'firefox') {
            this.conn.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
         }

         if (!this.conn.jingle) {
            jsxc.error('No jingle plugin found!');
            return;
         }

//        if (!jsxc.storage.getItem('iceConfig')) {
//            console.warn('No ICE config found!');
//            return;
//        }

         this.conn.jingle.PRANSWER = false;
         this.conn.jingle.AUTOACCEPT = false;
         this.conn.jingle.ice_config = jsxc.storage.getUserItem('iceConfig');
         this.conn.jingle.MULTIPARTY = false;
         this.conn.jingle.pc_constraints = RTC.pc_constraints;

         $(document).on('message.jsxc', $.proxy(this.onMessage, this));

         $(document).on('mediaready.jingle', $.proxy(this.onMediaReady, this));
         $(document).on('mediafailure.jingle', $.proxy(this.onMediaFailure, this));
         $(document).on('callincoming.jingle', $.proxy(this.onCallIncoming, this));
         //$(document).on('callactive.jingle', this.onCallActive);
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
      getTurnCrendentials: function () {

         if (!jsxc.options.turnCredentialsPath) {
            jsxc.warn('No path for TURN credentials defined!');
            return;
         }

         var ttl = (jsxc.storage.getUserItem('iceValidity') || 0) - (new Date()).getTime();
         if (ttl > 0) {
            //credentials valid

            window.setTimeout(jsxc.webrtc.getTurnCrendentials, ttl + 500);
            return;
         }

         $.ajax(jsxc.options.turnCredentialsPath, {
            async: true,
            success: function (data) {
               var iceConfig = {
                  iceServers: [{
                        url: 'turn:' + data.url,
                        credential: data.credential,
                        username: data.username
                     }]
               };

               jsxc.webrtc.conn.jingle.ice_config = iceConfig;
               jsxc.storage.setUserItem('iceConfig', iceConfig);
               jsxc.storage.setUserItem('iceValidity', (new Date()).getTime() + 1000 * data.ttl);
            }
         });
      },
      initWindow: function (event, win) {
         var self = jsxc.webrtc;

         if (!self.conn) {
            $(document).one('connectionReady.jsxc', function () {
               self.initWindow(null, win);
            });
            return;
         }
         var li = $('<li>Video</li>').addClass('jsxc_video');
         win.find('.jsxc_settings ul').append(li);

         self.updateWindow(win);
      },
      updateWindow: function (win) {
         if (win.length === 0) {
            return;
         }

         var self = jsxc.webrtc;
         var jid = win.data('jid');
         var li = win.find('.jsxc_video');

         if (Strophe.getResourceFromJid(jid) === null) {
            var cid = jsxc.jidToCid(jid);
            var res = jsxc.storage.getUserItem('buddy_' + cid).res;

            if (Array.isArray(res) && res.length === 1) {
               jid += '/' + res[0];
            }
         }

         li.off('click');

         if (self.conn.caps.hasFeatureByJid(jid, self.reqVideoFeatures)) {
            li.one('click', function () {
               self.startCall(jid);
            });
            li.removeClass('jsxc_disabled');
         } else {
            li.addClass('jsxc_disabled');
         }
      },
      onMessage: function (e, from) {
         var self = jsxc.webrtc;
         var bJid = Strophe.getBareJidFromJid(from);

         if (self.chatJids[bJid] !== from) {
            self.updateWindow(jsxc.gui.getWindow(jsxc.jidToCid(bJid)));
            self.chatJids[bJid] = from;
         }
      },
      setStatus: function (txt, d) {
         var status = $('.jsxc_webrtc .jsxc_status');
         var duration = d || 4000;

         if (status.html()) {
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

         var to = setTimeout(function () {
            status.stop().animate({
               opacity: 0
            },
            function () {
               status.html('');
            });
         }, duration);

         status.data('timeout', to);
      },
      onCaps: function (event, jid) {
         var self = jsxc.webrtc;
         var win = jsxc.gui.getWindow(jsxc.jidToCid(jid));

         if (win.length > 0) {
            self.updateWindow(win);
         }
      },
      onMediaReady: function (event, stream) {
         jsxc.debug('media ready');

         var self = jsxc.webrtc;

         self.localStream = stream;
         self.conn.jingle.localStream = stream;

         jsxc.gui.showVideoWindow(self.last_caller);

         var i;
         for (i = 0; i < stream.getAudioTracks().length; i++) {
            this.setStatus((stream.getAudioTracks().length > 0) ? 'Use remote audio device.' : 'No remote audio device');

            jsxc.debug('using audio device "' + stream.getAudioTracks()[i].label + '"');
         }
         for (i = 0; i < stream.getVideoTracks().length; i++) {
            this.setStatus((stream.getVideoTracks().length > 0) ? 'Use remote video device.' : 'No remote video device');

            jsxc.debug('using video device "' + stream.getVideoTracks()[i].label + '"');
         }

         $(document).one('cleanup.dialog.jsxc', $.proxy(self.hangUp, self));
         $(document).trigger('finish.mediaready.jsxc');
      },
      onMediaFailure: function () {
         this.setStatus('media failure');
      },
      acceptCall: function (sess, stream) {
         this.setStatus('Accept call');

         sess.localStream = stream;
         sess.peerconnection.addStream(stream);

         sess.sendAnswer();
         sess.accept();
      },
      initiateCall: function (jid) {
         var self = jsxc.webrtc;
         this.setStatus('Initiate call');

         $(document).one('error.jingle', function (e, sid, error) {
            if (error.source !== 'offer') {
               return;
            }

            self.conn.jingle.terminate(null, 'init fail');

            $(document).off('cleanup.dialog.jsxc');
            setTimeout(function () {
               jsxc.gui.showAlert("Sorry, we couldn't establish a connection. Maybe your buddy is offline.");
            }, 500);
         });

         this.conn.jingle.initiate(jid, this.conn.jid.toLowerCase());
      },
      onCallIncoming: function (event, sid) {
         jsxc.debug('incoming call' + sid);

         var self = this;
         var sess = this.conn.jingle.sessions[sid];
         var jid = jsxc.jidToCid(sess.peerjid);

         jsxc.notification.notify(jsxc.translate('%%Incoming call%%'), jsxc.translate('%%from%% ' + jid));

         //signal to partner
         sess.sendRinging();

         jsxc.webrtc.last_caller = sess.peerjid;

         jsxc.switchEvents({
            'mediaready.jingle': function (event, stream) {
               self.acceptCall(sess, stream);
            },
            'mediafailure.jingle': function () {
               sess.sendTerminate('decline');
               sess.terminate();
            }
         });

         if (jsxc.webrtc.AUTO_ACCEPT) {
            self.reqUserMedia();
            return;
         }

         var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', jid));

         dialog.find('.jsxc_accept').click(function () {
            self.reqUserMedia();
         });

         dialog.find('.jsxc_reject').click(function () {
            jsxc.gui.dialog.close();

            sess.sendTerminate('decline');
            sess.terminate();
         });
      },
      onCallTerminated: function (event, sid, reason, text) {
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
      onCallRinging: function () {
         this.setStatus('ringing...', 0);
      },
      onRemoteStreamAdded: function (event, data, sid) {
         this.setStatus('Remote stream for session ' + sid + ' added.');
         jsxc.debug('Stream data', data);

         var stream = data.stream;
         this.remoteStream = stream;

         var sess = this.conn.jingle.sessions[sid];

         sess.remoteDevices = {
            video: stream.getVideoTracks().length > 0,
            audio: stream.getAudioTracks().length > 0
         };

         this.setStatus((stream.getVideoTracks().length > 0) ? 'Use remote video device.' : 'No remote video device');
         this.setStatus((stream.getAudioTracks().length > 0) ? 'Use remote audio device.' : 'No remote audio device');

         if ($('.jsxc_remotevideo').length) {
            RTC.attachMediaStream($('.jsxc_remotevideo'), stream);
         }
      },
      onRemoteStreamRemoved: function (event, data, sid) {
         this.setStatus('Remote stream for session ' + sid + ' removed.');
      },
      onIceConnectionStateChanged: function (event, sid, sess) {
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

            $('.jsxc_info').attr('title', jsxc.translate('%%Local IP%%: ') + sess.local_ip + '\n' +
                    jsxc.translate('%%Remote IP%%: ') + sess.remote_ip + '\n' +
                    jsxc.translate('%%Local Fingerprint%%: ') + sess.local_fp + '\n' +
                    jsxc.translate('%%Remote Fingerprint%%: ') + sess.remote_fp);
         }
      },
      noStunCandidates: function () {

      },
      startCall: function (jid) {
         var self = this;

         if (Strophe.getResourceFromJid(jid) === null) {
            jsxc.debug('We need a full jid');
            return;
         }

//        if (self.conn.jingle.jid2session[jid]){
//            jsxc.debug('With user ' + jid + ' we have already a active session.');
//            return;
//        }

         self.last_caller = jid;

         jsxc.switchEvents({
            'finish.mediaready.jsxc': function () {
               self.initiateCall(jid);
            },
            'mediafailure.jingle': function () {

            }
         });

         this.reqUserMedia();
      },
      hangUp: function () {
         $(document).off('cleanup.dialog.jsxc');

         this.conn.jingle.terminate();
         $(document).trigger('callterminated.jingle');
      },
      reqUserMedia: function () {
         if (this.localStream) {
            $(document).trigger('mediaready.jingle', [this.localStream]);
            return;
         }

         //jsxc.gui.dialog.open(jsxc.gui.template.get('allowAccess'));
         this.setStatus('please allow access to microphone and camera');
         getUserMediaWithConstraints(['video', 'audio']);
      },
      snapshot: function (video) {
         if (!video) {
            jsxc.debug('Missing video element');
         }

         $('.jsxc_snapshotbar p').remove();

         var canvas = $('<canvas/>')
                 .css('display', 'none')
                 .appendTo('body')
                 .attr({
            width: video.width(),
            height: video.height()
         })
                 .get(0);
         var ctx = canvas.getContext('2d');

         ctx.drawImage(video[0], 0, 0); //, video.width(), video.height()
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

   jsxc.gui.showVideoWindow = function (jid) {
      jsxc.gui.dialog.open(jsxc.gui.template.get('videoWindow'), {
         noClose: true
      });

      var self = jsxc.webrtc;

      $(document).one('complete.dialog.jsxc', function () {

         //mute own video element to avoid echoes
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

         //fit in video
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

         var win = jsxc.gui.window.open(jsxc.jidToCid(jid));
         $('#jsxc_dialog .jsxc_chatarea ul').append(win.detach());

         $(document).one('cleanup.dialog.jsxc', function () {
            $('#jsxc_windowList > ul').prepend(win.detach());
         });

         $('#jsxc_dialog .jsxc_hangUp').click(function () {
            jsxc.webrtc.hangUp();
         });

         $('#jsxc_dialog .jsxc_snapshot').click(function () {
            jsxc.webrtc.snapshot(rv);
            $('#jsxc_dialog .jsxc_snapshots').click();
         });

         $('#jsxc_dialog .jsxc_snapshots').click(function () {
            $('#jsxc_dialog .jsxc_chatarea').slideUp();
            $('#jsxc_dialog .jsxc_snapshotbar').slideToggle();
         });

//        $('#jsxc_dialog .jsxc_mute_local').click(function(){
//
//        });

//        $('#jsxc_dialog .jsxc_pause_local').click(function(){console.log(self.localStream.getVideoTracks(0));
//            if(lv[0].paused){
//                self.localStream.play();
//                //self.localStream.getVideoTracks(0).enabled = true;
//                $(this).text('pause my video');
//            }else{
//                self.localStream.stop();
//                //self.localStream.getVideoTracks(0).enabled = false;
//                $(this).text('resume my video');
//            }
//        });

         $('#jsxc_dialog .jsxc_chat').click(function () {
            $('#jsxc_dialog .jsxc_snapshotbar').slideUp();
            $('#jsxc_dialog .jsxc_chatarea').slideToggle();
         });

         $('#jsxc_dialog .jsxc_fullscreen').click(function () {


            if ($.support.fullscreen) {
               //Reset position of localvideo
               $(document).one('disabled.fullscreen', function () {
                  lv.removeAttr('style');
               });

               $('#jsxc_dialog .jsxc_videoContainer').fullscreen();
            } else {
               //Fallback:

               rv.data('old_height', rv.height());
               rv.data('old_width', rv.width());

               $('body').append(rv.detach());
               $('body').append(lv.detach());

               rv.height($('body').height());
               rv.width($('body').width());

               rv.addClass('jsxc_fullscreen');
               lv.addClass('jsxc_fullscreen');

               //need to resume video after detach
               lv[0].play();
               rv[0].play();

               //fancybox specific stuff:
               //remove ESC event handler and save for later
               var old_event_handler;
               $.each($(document).data('events').keydown, function (index, value) {
                  if (value.namespace === 'fb') {
                     old_event_handler = value.handler;
                     $(document).off('keydown.fb');

                     return false; //abort loop
                  }
               });

               $(document).one('keydown.jsxc', function (e) {
                  if (e.keyCode === jsxc.CONST.KEYCODE_ESC) {
                     $('.jsxc_videoContainer').append(rv.detach());
                     $('.jsxc_videoContainer').append(lv.detach());

                     rv.height(rv.data('old_height'));
                     rv.width(rv.data('old_width'));

                     rv.removeClass('jsxc_fullscreen');
                     lv.removeClass('jsxc_fullscreen');

                     lv[0].play();
                     rv[0].play();

                     lv.removeAttr('style');

                     $(window).off('resize.fullscreen.jsxc');

                     //fancybox specific stuff:
                     //readd ESC event handler
                     $(document).on('keydown.fb', old_event_handler);
                  }
               });

               $(window).on('resize.fullscreen.jsxc', function () {


                  if (rv.length) {
                     rv.height($('body').height());
                     rv.width($('body').width());

                     rv[0].play();
                  }
               });
            }
         });

         $('#jsxc_dialog .jsxc_volume').change(function () {
            rv[0].volume = $(this).val();
         });
         $('#jsxc_dialog .jsxc_volume').dblclick(function () {
            $(this).val(0.5);
         });
      });
   };


   $.extend(jsxc.CONST, {
      KEYCODE_ENTER: 13,
      KEYCODE_ESC: 27
   });

   $(document).ready(function () {
      RTC = setupRTC();

      if (RTC !== null) {
         RTCPeerconnection = RTC.peerconnection;

         $(document).on('init.window.jsxc', jsxc.webrtc.initWindow);

         var init = function () {
            jsxc.webrtc.init();
         };

         jsxc.switchEvents({
            'connected': init,
            'attached': init
         });
      }



//    localvid = document.getElementById('localvideo');
//    remotevid = document.getElementById('remotevideo');


   });
}(jQuery));