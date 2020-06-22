import Log from '../util/Log'
import Translation from '../util/Translation'
import { VideoDialog } from './VideoDialog'
import JingleMediaSession from '@src/JingleMediaSession';

export default class VideoWindow {
   private videoElement: JQuery;

   private wrapperElement: JQuery;

   constructor(private videoDialog: VideoDialog, private session: JingleMediaSession) {
      this.registerHooks();
      this.initWrapper();
   }

   private registerHooks() {
      //@TODO remaining events: hold, resume, mute, unmute

      this.session.on('change:connectionState', this.onIceConnectionStateChanged);
      this.session.on('peerStreamAdded', this.addStream);
      this.session.on('peerStreamRemoved', this.removeStream);
      this.session.on('ringing', this.callRinging);
      this.session.on('accepted', this.callAccepted);
   }

   private initWrapper() {
      this.wrapperElement = $('<div>');
      this.wrapperElement.addClass('jsxc-video-wrapper jsxc-establishing');
      this.wrapperElement.attr('data-sid', this.session.getId());

      this.videoDialog.addContainer(this.wrapperElement);
   }

   private onIceConnectionStateChanged = (state: string) => {
      Log.debug('connection state for ' + this.session.getId(), state);

      if (state === 'connected') {
         this.wrapperElement.removeClass('jsxc-establishing');
         this.wrapperElement.addClass('jsxc-ice-connected');

         let remoteStreams = this.session.getRemoteStreams();

         if (remoteStreams.length > 0) {
            this.addStream(remoteStreams[0]);
         }
      } else if (state === 'failed') {
         Log.warn('ICE connection failed');

         this.session.end('failed-transport');
      } else if (state === 'interrupted') {
         this.videoDialog.setStatus(Translation.t('Connection_interrupted'));
      }
   }

   private callAccepted = () => {
      this.wrapperElement.removeClass('jsxc-ringing');

      this.videoDialog.clearStatus();
   }

   private callRinging = () => {
      this.videoDialog.setStatus('ringing...', 0);

      this.wrapperElement.removeClass('jsxc-establishing');
      this.wrapperElement.addClass('jsxc-ringing');
   }

   private addStream = (stream: MediaStream) => {
      if (this.videoElement) {
         return;
      }

      //@REVIEW can a session contain multiple streams?
      Log.debug('Remote stream for session ' + this.session.getId() + ' added.');

      let isVideoDevice = stream.getVideoTracks().length > 0;
      let isAudioDevice = stream.getAudioTracks().length > 0;

      this.videoDialog.setStatus(isVideoDevice ? 'Use remote video device.' : 'No remote video device');
      this.videoDialog.setStatus(isAudioDevice ? 'Use remote audio device.' : 'No remote audio device');

      this.videoElement = $('<video autoplay playsinline></video>');
      this.videoElement.appendTo(this.wrapperElement);

      VideoDialog.attachMediaStream(this.videoElement, stream);

      if (isVideoDevice) {
         this.wrapperElement.addClass('jsxc-video-available');
      }

      if (isAudioDevice) {
         this.wrapperElement.addClass('jsxc-audio-available');
      }
   }

   private removeStream = () => {
      Log.debug('Remote stream for ' + this.session.getId() + ' removed.');

      VideoDialog.detachMediaStream(this.videoElement);

      this.videoElement.remove();
      this.videoElement = undefined;
   }
}
