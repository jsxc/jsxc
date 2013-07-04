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
            </div>\n\
            <div class="jsxc_controlbar">\n\
                <button type="button" class="jsxc_hangUp">%%hang_up%%</button>\n\
                <input type="range" class="jsxc_volume" min="0.0" max="1.0" step="0.05" value="0.5" />\n\
                <button type="button" class="jsxc_snapshot">%%snapshot%%</button>\n\
                <!-- <button type="button" class="jsxc_mute_local">%%mute_my_audio%%</button>\n\
                <button type="button" class="jsxc_pause_local">%%pause_my_video%%</button> --> \n\
                <button type="button" class="jsxc_chat">%%chat%%</button>\n\
                <button type="button" class="jsxc_fullscreen">%%fullscreen%%</button>\n\
            </div>\n\
            <div class="jsxc_status"></div>\n\
            <div class="jsxc_picturebar"></div>\n\
        </div>';

jsxc.webrtc = {
    conn: null,
    localStream: null,
    remoteStream: null,
    AUTO_ACCEPT: true,
    init: function() {

        //shortcut
        this.conn = jsxc.xmpp.conn;

        if (RTC.browser == 'firefox') {
            this.conn.jingle.media_constraints.mandatory['MozDontOfferDataChannel'] = true;
        }

        this.conn.jingle.PRANSWER = false;
        this.conn.jingle.AUTOACCEPT = false;
        this.conn.jingle.ice_config = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
        this.conn.jingle.MULTIPARTY = false;
        this.conn.jingle.pc_constraints = RTC.pc_constraints;

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

        $(document).on('.jingle', function(e) {
            console.log(e);
        })
    },
    initWindow: function(event, win) {
        var self = jsxc.webrtc;

        win.find('.jsxc_settings ul').append('<li>Video</li>').addClass('jsxc_video').click(function() {
            self.startCall(win.data('jid'));
        });

    },
    setStatus: function(txt) {
        console.log('status', txt);
        $('.jsxc_webrtc .jsxc_status').html(txt);
    },
    onMediaReady: function(event, stream) {
        jsxc.debug('media ready');

        var self = jsxc.webrtc;

        self.localStream = stream;
        self.conn.jingle.localStream = stream;

        jsxc.gui.showVideoWindow(self);

        for (i = 0; i < stream.getAudioTracks().length; i++) {
            //@TODO: Add notification
            jsxc.debug('using audio device "' + stream.getAudioTracks()[i].label + '"');
        }
        for (i = 0; i < stream.getVideoTracks().length; i++) {
            //@TODO: Add notification
            jsxc.debug('using video device "' + stream.getVideoTracks()[i].label + '"');
        }

        $(document).one('cleanup.dialog.jsxc', $.proxy(self.hangUp, self));
        $(document).trigger('finish.mediaready.jsxc');
    },
    onMediaFailure: function() {
        this.setStatus('media failure');
    },
    acceptCall: function(sess, stream) {
        this.setStatus('Accept call');

        sess.localStream = stream;
        sess.peerconnection.addStream(stream);

        sess.sendAnswer();
        sess.accept();
    },
    initiateCall: function(jid) {
        this.setStatus('Initiate call');
        this.conn.jingle.initiate(jid, this.conn.jid,
                function(success, stanza) {
                    if (!success) {
                        console.log('session initiate error', stanza);
                    }
                });
    },
    onCallIncoming: function(event, sid) {
        this.setStatus('incoming call' + sid);

        var self = this;

        //signal to partner
        this.conn.jingle.sessions[sid].sendRinging();

        sess = this.conn.jingle.sessions[sid];

        jsxc.switchEvents({
            'mediaready.jingle': function(event, stream) {
                self.acceptCall(sess, stream);
            },
            'mediafailure.jingle': function() {
                sess.sendTerminate('decline');
                sess.terminate();
            }
        })

        if(jsxc.webrtc.AUTO_ACCEPT){
            self.reqUserMedia();
            return;
        }

        var dialog = jsxc.gui.dialog.open(jsxc.gui.template.get('incomingCall', jsxc.jidToCid(sess.peerjid)));

        dialog.find('.jsxc_accept').click(function() {
            self.reqUserMedia();
        });

        dialog.find('.jsxc_reject').click(function() {
            jsxc.gui.dialog.close();

            sess.sendTerminate('decline');
            sess.terminate();
        });
    },
    onCallTerminated: function(event, sid, reason, text) {
        this.setStatus('call terminated ' + sid + (reason ? (': ' + reason + ' ' + text) : ''));

        this.localStream.stop();

        $('.jsxc_remotevideo')[0].src = "";
        $('.jsxc_localvideo')[0].src = "";

        this.conn.jingle.localStream = null;
        this.localStream = null;
        this.remoteStream = null;

        $(document).off('cleanup.dialog.jsxc');
        jsxc.gui.dialog.close();
        
        $('.jsxc_localvideo').remove();
        $('.jsxc_remotevideo').remove();
    },
    onCallRinging: function(event, sid) {
        this.setStatus('ringing...');
    },
    onRemoteStreamAdded: function(event, data, sid) {
        this.setStatus('Remote stream for session ' + sid + ' added.');
        console.log('Stream data', data);

        stream = data.stream;
        this.remoteStream = stream;

        this.conn.jingle.sessions[sid].remoteDevices = {
            video: stream.getVideoTracks().length > 0,
            audio: stream.getAudioTracks().length > 0
        };

        this.setStatus((stream.getVideoTracks().length > 0) ? 'Use remote video device.' : 'No remote video device');
        this.setStatus((stream.getAudioTracks().length > 0) ? 'Use remote audio device.' : 'No remote audio device');

//        var src = window.URL.createObjectURL(data.stream);

        if ($('.jsxc_remotevideo').length)
            RTC.attachMediaStream($('.jsxc_remotevideo'), stream);
    },
    onRemoteStreamRemoved: function(event, data, sid) {
        this.setStatus('Remote stream for session ' + sid + ' removed.');
    },
    onIceConnectionStateChanged: function(event, sid, sess) {
        console.log('ice state for', sid, sess.peerconnection.iceConnectionState);
        console.log('sig state for', sid, sess.peerconnection.signalingState);

        // works like charm, unfortunately only in chrome and FF nightly, not FF22 beta
        /*
         if (sess.peerconnection.signalingState == 'stable' && sess.peerconnection.iceConnectionState == 'connected') {
         var el = $("<video autoplay='autoplay' style='display:none'/>").attr('id', 'largevideo_' + sid);
         $(document).trigger('callactive', [el, sid]);
         RTC.attachMediaStream(el, sess.remoteStream); // moving this before the trigger doesn't work in FF?!
         }
         */
    },
    noStunCandidates: function(event) {
//    setStatus('webrtc did not encounter stun candidates, NAT traversal will not work');
//    console.warn('webrtc did not encounter stun candidates, NAT traversal will not work');
    },
    startCall: function(jid) {
        var self = this;

        if (!jid.match(/.+@.+\/.+/)) {
            console.log('We need a full jid');
            return;
        }

        jsxc.switchEvents({
            'finish.mediaready.jsxc': function() {
                self.initiateCall(jid);
            },
            'mediafailure.jingle': function() {

            }
        });

        this.reqUserMedia();
    },
    hangUp: function() {
        $(document).off('cleanup.dialog.jsxc');

        this.conn.jingle.terminate();
        $(document).trigger('callterminated.jingle');
    },
    reqUserMedia: function() {
        if (this.localStream) {
            $(document).trigger('mediaready.jingle', [this.localStream]);
            return;
        }

        //jsxc.gui.dialog.open(jsxc.gui.template.get('allowAccess'));
        this.setStatus('please allow access to microphone and camera');
        getUserMediaWithConstraints(['video', 'audio']);
    },
    snapshot: function(video){
        if(!video)
            console.error('Missing video element')
        
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
        var img = $('<img/>')
        var url = canvas.toDataURL('image/jpeg');
        img[0].src = url;
        var link = $('<a/>').attr({
            target: '_blank',
            href: url
        });
        link.append(img);
        $('.jsxc_picturebar').append(link);
        
        canvas.remove();
  }
};

/**
 * executes only one of the given events
 * 
 * @param {string} obj.key eventname
 * @param {function} obj.value function to execute
 * @returns {string} namespace of all events
 */
jsxc.switchEvents = function(obj) {
    var ns = Math.random().toString(36).substr(2, 12);
    var self = this;

    $.each(obj, function(key, val) {
        $(document).one(key + '.' + ns, function() {
            $(document).off('.' + ns);

            val.apply(self, arguments);
        })
    });

    return ns;
}

jsxc.gui.showVideoWindow = function(self) {
    jsxc.gui.dialog.open(jsxc.gui.template.get('videoWindow'));

    $(document).one('complete.dialog.jsxc', function(){
        
        //mute own video element to avoid echoes
        $('#jsxc_dialog .jsxc_localvideo')[0].muted = true;
        $('#jsxc_dialog .jsxc_localvideo')[0].volume = 0;

        var rv = $('#jsxc_dialog .jsxc_remotevideo');
        var lv = $('#jsxc_dialog .jsxc_localvideo');

        lv.draggable({containment: "parent"});

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
        
        if (self.remoteStream)
        RTC.attachMediaStream(rv, self.remoteStream);
    
        $('#jsxc_dialog .jsxc_hangUp').click(function(){
            jsxc.webrtc.hangUp();
        });

        $('#jsxc_dialog .jsxc_snapshot').click(function(){
            jsxc.webrtc.snapshot(rv);
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

        $('#jsxc_dialog .jsxc_chat').click(function(){

        });

        $('#jsxc_dialog .jsxc_fullscreen').click(function(){
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
            $.each($(document).data('events').keydown, function(index, value){
                if(value.namespace == 'fb'){
                    old_event_handler = value.handler;
                    $(document).off('keydown.fb');
                    
                    return false; //abort loop
                }
            });
            
            $(document).one('keydown.jsxc', function(e){
                if(e.keyCode === jsxc.CONST.KEYCODE_ESC){
                    $('.jsxc_videoContainer').append(rv.detach());
                    $('.jsxc_videoContainer').append(lv.detach());
                    
                    rv.height(rv.data('old_height'));
                    rv.width(rv.data('old_width'));
                    
                    rv.removeClass('jsxc_fullscreen');
                    
                    lv[0].play();
                    rv[0].play();
                    
                    lv.removeAttr('style');
                    
                    //fancybox specific stuff:
                    //readd ESC event handler
                    $(document).on('keydown.fb', old_event_handler);
                }
            });
        });

        $('#jsxc_dialog .jsxc_volume').change(function(){
            rv[0].volume = $(this).val();
        });
        $('#jsxc_dialog .jsxc_volume').dblclick(function(){
            $(this).val(0.5);
        });
    });
};


jsxc.CONST = {
    KEYCODE_ENTER: 13,
    KEYCODE_ESC: 27
};

$(document).ready(function() {
    RTC = setupRTC();

    if (RTC != null) {
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



//    localvid = document.getElementById('localvideo');
//    remotevid = document.getElementById('remotevideo');


});

var mytest;