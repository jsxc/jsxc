import ConfirmDialog from './dialogs/confirm'
import Dialog from './Dialog'
import Log from '../util/Log'
import JingleHandler from '../connection/JingleHandler'
import VideoWindow from './VideoWindow'
import JingleMediaSession from '../JingleMediaSession';
import Translation from '@util/Translation';
import JingleCallSession from '@src/JingleCallSession';

const VideoDialogTemplate = require('../../template/videoDialog.hbs')

export class VideoDialog {
   private dom: JQuery;

   private videoWindows: {[sessionId: string]: VideoWindow} = {};

   private localStream: MediaStream;

   private ready: boolean = true;

   constructor() {
      let htmlString = VideoDialogTemplate({});

      this.dom = $(htmlString);
   }

   public getDom() {
      return this.dom;
   }

   public addSession(session: JingleMediaSession) {
      session.on('terminated', (reason) => {
         this.removeSession(session, reason);
      });

      let msg: string;

      if (session instanceof JingleCallSession) {
         msg = ':telephone_receiver: ' + Translation.t('Call_started');
      } else {
         msg = ':screen: ' + Translation.t('Stream_started');
      }

      session.getPeer().addSystemMessage(msg);

      let videoWindow = new VideoWindow(this, session);

      this.videoWindows[session.getId()] = videoWindow;
   }

   public showCallDialog(session: JingleMediaSession) {
      //@TODO translate
      //@TODO use selection dialog, because button labels can be configured
      //@TODO confirm dialog is special case of selection dialog

      let mediaRequested = session.getMediaRequest();
      let peerName = session.getPeer().getName();
      let isVideoCall = mediaRequested.indexOf('video') > -1;
      let isStream = mediaRequested.length === 0;
      let infoText: string;

      if (isStream) {
         infoText = `Incoming_stream from ${peerName}`;
      } else if (isVideoCall) {
         infoText = `Incoming video call from ${peerName}`;
      } else {
         infoText = `Incoming call from ${peerName}`;
      }

      let confirmDialog = ConfirmDialog(infoText);

      session.on('terminated', () => {
         confirmDialog.close();
      });

      session.on('aborted', () => {
         confirmDialog.close();
      });

      return confirmDialog.getPromise().then((dialog: Dialog) => {
         session.adopt();

         dialog.close();
      });
   }

   public showVideoWindow(localStream?: MediaStream) {
      this.dom.appendTo('body');

      let localVideoElement = this.dom.find('.jsxc-local-video');

      if (typeof (<any> localVideoElement).draggable === 'function') {
         (<any> localVideoElement).draggable({
            containment: 'parent'
         });
      }

      if (localStream) {
         this.localStream = localStream;
         VideoDialog.attachMediaStream(localVideoElement, localStream);

         if (localStream.getVideoTracks().length === 0) {
            Log.debug('No local video device available');

            localVideoElement.hide();
         }
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

            // (<any>$('#jsxc_webrtc .jsxc_videoContainer')).fullscreen();
         });
      } else {
         this.dom.find('.jsxc-fullscreen').hide();
      }

      this.dom.find('.jsxc-video-container').click(() => {
         this.dom.find('.jsxc-controlbar').toggleClass('jsxc-visible');
      });
   }

   public minimize() {
      this.dom.find('.jsxc-video-container').addClass('jsxc-minimized');
   }

   public maximize() {
      this.dom.find('.jsxc-video-container').removeClass('jsxc-minimized');
   }

   public addContainer(containerElement) {
      this.dom.find('.jsxc-video-container').addClass('jsxc-device-available');
      this.dom.find('.jsxc-video-container').append(containerElement);

      let numberOfContainer = this.dom.find('.jsxc-video-container > .jsxc-video-wrapper').length;

      this.dom.find('.jsxc-video-container').attr('data-videos', numberOfContainer);
   }

   //@REVIEW still used?
   public setStatus(txt, d?) {
      let status = $('.jsxc_webrtc .jsxc_status');
      let duration = (typeof d === 'undefined' || d === null) ? 4000 : d;

      Log.debug('[Webrtc]', txt);

      if (status.html()) {
         // attach old messages
         txt = status.html() + '<br />' + txt;
         //@TODO escape html; maybe use p element
      }

      status.html(txt);

      status.css({
         'margin-left': '-' + (status.width() / 2) + 'px',
         'opacity': 0,
         'display': 'block'
      });

      //@TODO use css animation
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

   public isReady(): boolean {
      return this.ready;
   }

   private removeSession = (session: JingleMediaSession, reason?) => {
      let msg = (reason && reason.condition ? (': ' + Translation.t('jingle_reason_' + reason.condition)) : '') + '.';

      if (session instanceof JingleCallSession) {
         msg = Translation.t('Call_terminated') + msg;
      } else {
         msg = Translation.t('Stream_terminated') + msg;
      }

      session.getPeer().addSystemMessage(':checkered_flag: ' + msg);

      Log.debug('Session ' + session.getId() + ' was removed. Reason: ' + msg);

      delete this.videoWindows[session.getId()];

      if (Object.keys(this.videoWindows).length === 0) {
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

   public static attachMediaStream = (element: JQuery|HTMLMediaElement, stream: MediaStream) => {
      let el = <HTMLMediaElement> ((element instanceof jQuery) ? (<JQuery> element).get(0) : element);
      el.srcObject = stream;

      $(element).show();
   }

   public static detachMediaStream = (element: JQuery|HTMLMediaElement) => {
      let el = <HTMLMediaElement> ((element instanceof jQuery) ? (<JQuery> element).get(0) : element);

      if (!el) {
         return;
      }

      VideoDialog.stopStream(el.srcObject);
      el.srcObject = null;

      $(el).removeClass('jsxc-device-available jsxc-video-available jsxc-audio-available');
   }

   private static stopStream(stream) {
      if (typeof stream.getTracks === 'function') {
         let tracks = stream.getTracks();
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
