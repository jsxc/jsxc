import ConfirmDialog from './dialogs/confirm'
import Dialog from './Dialog'
import Log from '../util/Log'
import JingleHandler from '../connection/JingleHandler'
import VideoWindow from './VideoWindow'
import JingleMediaSession from '../JingleMediaSession';
import Translation from '@util/Translation';
import JingleCallSession from '@src/JingleCallSession';
import * as screenfull from 'screenfull';

const screen = screenfull as screenfull.Screenfull;

const VideoDialogTemplate = require('../../template/videoDialog.hbs')

export class VideoDialog {
   private dom: JQuery;

   private videoWindows: { [sessionId: string]: VideoWindow } = {};

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
         this.removeContainer(session.getId());

         this.removeSession(session, reason);
      });

      let msg: string;

      if (session instanceof JingleCallSession) {
         msg = ':telephone_receiver: ' + Translation.t('Call_started');
      } else {
         msg = ':tv: ' + Translation.t('Stream_started');
      }

      session.getPeer().addSystemMessage(msg);

      let videoWindow = new VideoWindow(this, session);

      this.videoWindows[session.getId()] = videoWindow;
   }

   public showCallDialog(session: JingleMediaSession) {
      //@TODO use selection dialog, because button labels can be configured
      //@TODO confirm dialog is special case of selection dialog

      let mediaRequested = session.getMediaRequest();
      let peerName = session.getPeer().getName();
      let isVideoCall = mediaRequested.indexOf('video') > -1;
      let isStream = mediaRequested.length === 0;
      let infoText: string;

      if (isStream) {
         infoText = `${Translation.t('Incoming_stream')} ${Translation.t('from')} ${peerName}`;
      } else if (isVideoCall) {
         infoText = `${Translation.t('Incoming_video_call')} ${Translation.t('from')} ${peerName}`;
      } else {
         infoText = `${Translation.t('Incoming_call')} ${Translation.t('from')} ${peerName}`;
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
      }).catch(() => {
         session.adopt();

         // tslint:disable-next-line:no-string-throw
         throw 'decline';
      });
   }

   public showVideoWindow(localStream?: MediaStream) {
      this.dom.appendTo('body');

      let localVideoElement = this.dom.find('.jsxc-local-video');
      let localCameraControl = this.dom.find('.jsxc-video');
      let localMicrophoneControl = this.dom.find('.jsxc-microphone');

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
            localCameraControl.hide();
            localVideoElement.hide();
         } else if (localStream.getVideoTracks().filter((track: MediaStreamTrack) => track.enabled).length === 0) {
            Log.debug('There are no video tracks enabled');
            localCameraControl.addClass('jsxc-disabled');
         }

         if (localStream.getAudioTracks().length === 0) {
            Log.debug('No local audio device available');
            localMicrophoneControl.hide();
         } else if (localStream.getAudioTracks().filter((track: MediaStreamTrack) => track.enabled).length === 0) {
            Log.debug('There are no audio tracks enabled');
            localMicrophoneControl.addClass('jsxc-disabled');
         }
      } else {
         Log.debug('No local stream available');

         localCameraControl.hide();
         localVideoElement.hide();
         localMicrophoneControl.hide();
      }

      localMicrophoneControl.click(() => {
         VideoDialog.changeStreamMediaState(localMicrophoneControl, localStream.getAudioTracks());
      });

      localCameraControl.click(() => {
         VideoDialog.changeStreamMediaState(localCameraControl, localStream.getVideoTracks());
      });

      this.dom.find('.jsxc-hang-up').click(() => {
         JingleHandler.terminateAll('success');
      });

      this.dom.find('.jsxc-video-control.jsxc-minmax').click(() => {
         this.dom.toggleClass('jsxc-minimized');
      });

      if (screen) {
         screen.on('change', () => {
            this.resetPositionOfLocalVideoElement();
         });

         this.dom.find('.jsxc-fullscreen').click(() => {
            if (screen.isFullscreen) {
               screen.exit();
            } else {
               screen.request(this.dom.get(0));
            }
         });
      } else {
         this.dom.find('.jsxc-fullscreen').hide();
      }

      this.dom.find('.jsxc-video-container').click(() => {
         this.dom.find('.jsxc-controlbar').toggleClass('jsxc-visible');
      });
   }

   public minimize() {
      this.dom.addClass('jsxc-minimized');
   }

   public maximize() {
      this.dom.removeClass('jsxc-minimized');
   }

   public addContainer(containerElement) {
      this.dom.find('.jsxc-video-container').addClass('jsxc-device-available');
      this.dom.find('.jsxc-video-container').append(containerElement);

      this.updateNumberOfContainer();
   }

   private resetPositionOfLocalVideoElement() {
      let localVideoElement = this.dom.find('.jsxc-local-video');

      localVideoElement.css({
         top: '',
         left: '',
         bottom: '',
         right: '',
      });
   }

   private removeContainer(sessionId: string) {
      this.dom.find(`[data-sid="${sessionId}"]`).remove();

      this.updateNumberOfContainer();
   }

   private updateNumberOfContainer() {
      let numberOfContainer = this.dom.find('.jsxc-video-container > .jsxc-video-wrapper').length;

      this.dom.find('.jsxc-video-container').attr('data-videos', numberOfContainer);
   }

   //@REVIEW still used?
   public setStatus(message, duration = 4000) {
      let statusElement = this.dom.find('.jsxc-status');

      Log.debug('[Webrtc]', message);

      let messageElement = $('<p>').text(message);
      messageElement.appendTo(statusElement);

      statusElement.addClass('jsxc-status--visible');

      if (duration === 0) {
         return;
      }

      setTimeout(() => {
         messageElement.remove();

         if (statusElement.children().length === 0) {
            statusElement.removeClass('jsxc-status--visible');
         }
      }, duration);
   }

   public clearStatus() {
      let statusElement = this.dom.find('.jsxc-status');

      statusElement.empty();
      statusElement.removeClass('jsxc-status--visible');
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

   public close() {
      this.ready = false;

      this.dom.remove();

      if (this.localStream) {
         VideoDialog.stopStream(this.localStream);
      }
   }

   private static changeStreamMediaState = (element: JQuery, tracks: MediaStreamTrack[]) => {
      element.toggleClass('jsxc-disabled');
      let streamEnabled = !element.hasClass('jsxc-disabled');
      tracks.forEach((track: MediaStreamTrack) => track.enabled = streamEnabled);
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

      if (!stream) {
         Log.warn('Could not stop stream. Stream is null.');
         return;
      }

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
