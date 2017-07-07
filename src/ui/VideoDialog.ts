import ConfirmDialog from './dialogs/confirm'
import Dialog from './Dialog'
import Log from '../util/Log'
import JingleHandler from '../connection/JingleHandler'
import VideoWindow from './VideoWindow'

const VideoDialogTemplate = require('../../template/videoDialog.hbs')

export class VideoDialog {
   private dom;

   private videoWindows:Array<VideoWindow> = [];

   private localStream;

   private ready:boolean = true;

   constructor() {
      let htmlString = VideoDialogTemplate({});

      this.dom = $(htmlString);
   }

   public getDom() {
      return this.dom;
   }

   public addSession(session) {
      session.on('terminated', this.removeSession);

      let videoWindow = new VideoWindow(this, session);

      session.videoWindow = videoWindow;

      this.videoWindows.push(videoWindow);
   }

   public showCallDialog(session) {
      //@TODO add auto accept
      //@TODO translate
      //@TODO use selection dialog, because button labels can be configured
      //@TODO confirm dialog is special case of selection dialog

      let confirmDialog = ConfirmDialog('Incoming call from ...');

      session.on('terminated', () => {
         confirmDialog.getDialog().close();
      });

      return confirmDialog.getPromise().then((dialog:Dialog) => {
         dialog.close();
      });
   }

   public showVideoWindow(localStream?) {
      this.dom.appendTo('body');

      let localVideoElement = this.dom.find('.jsxc-local-video');

      localVideoElement.draggable({
         containment: 'parent'
      });

      if (localStream) {
         this.localStream = localStream;
         VideoDialog.attachMediaStream(localVideoElement, localStream);
      }

      this.dom.find('.jsxc-hang-up').click(() => {
         JingleHandler.terminateAll('success');
      });

      if ($.support.fullscreen) {
         this.dom.find('.jsxc-fullscreen').click(() => {
            $(document).one('disabled.fullscreen', function() {
               // Reset position of localvideo
               localVideoElement.removeAttr('style');
            });

            (<any> $('#jsxc_webrtc .jsxc_videoContainer')).fullscreen();
         });
      } else {
         this.dom.find('.jsxc-fullscreen').hide();
      }

      this.dom.find('.jsxc-video-container').click(() => {
         this.dom.find('.jsxc-controlbar').toggleClass('jsxc-visible');
      });
   }

   public addContainer(containerElement) {
      this.dom.find('.jsxc-video-container').addClass('jsxc-device-available');
      this.dom.find('.jsxc-video-container').append(containerElement);

      let numberOfContainer = this.dom.find('.jsxc-video-container > .jsxc-video-wrapper').length;

      this.dom.find('.jsxc-video-container').attr('data-videos', numberOfContainer);
   }

   public setStatus(txt, d?) {
      let status = $('.jsxc_webrtc .jsxc_status');
      let duration = (typeof d === 'undefined' || d === null) ? 4000 : d;

      Log.debug('[Webrtc]', txt);

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

      let to = setTimeout(function() {
         status.stop().animate({
            opacity: 0
         }, function() {
            status.html('');
         });
      }, duration);

      status.data('timeout', to);
   }

   public isReady():boolean {
      return this.ready;
   }

   private postCallMessage(msg, uid) {
      // jsxc.gui.window.postMessage({
      //    _uid: uid,
      //    bid: bid,
      //    direction: jsxc.Message.SYS,
      //    msg: ':telephone_receiver: ' + msg
      // });
   }

   private postScreenMessage(msg, uid) {
      // jsxc.gui.window.postMessage({
      //    _uid: uid,
      //    bid: bid,
      //    direction: jsxc.Message.SYS,
      //    msg: ':computer: ' + msg
      // });
   }

   private removeSession = (session, reason?) => {
      //@TODO translate
      var msg = (reason && reason.condition ? (': ' + ('jingle_reason_' + reason.condition)) : '') + '.';

      if (session.call) {
         msg = ('Call_terminated') + msg;
         this.postCallMessage(msg, session.sid);
      } else {
         msg = ('Stream_terminated') + msg;
         this.postScreenMessage(msg, session.sid);
      }

      Log.debug('Session ' + session.sid + ' was removed. Reason: ' + msg);

      this.videoWindows.splice(this.videoWindows.indexOf(session.videoWindow), 1);

      if (this.videoWindows.length === 0) {
         this.close();
      }
   }

   private close() {
      this.ready = false;

      this.dom.remove();

      if (this.localStream) {
         VideoDialog.stopStream(this.localStream);
      }
   }

   public static attachMediaStream = (element, stream) => {
      let el = (element instanceof jQuery) ? element.get(0) : element;
      el.srcObject = stream;

      $(element).show();
   }

   public static dettachMediaStream = (element) => {
      let el = (element instanceof jQuery) ? element.get(0) : element;

      VideoDialog.stopStream(el.srcObject);
      el.srcObject = null;

      $(el).removeClass('jsxc-device-available jsxc-video-available jsxc-audio-available');
   }

   private static stopStream(stream) {
      if (typeof stream.getTracks === 'function') {
         var tracks = stream.getTracks();
         tracks.forEach(function(track) {
            track.stop();
         });
      } else if (typeof stream.stop === 'function') {
         stream.stop();
      } else {
         Log.warn('Could not stop stream');
      }
   }
}
