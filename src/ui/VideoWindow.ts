import Log from '../util/Log'
import {VideoDialog} from './VideoDialog'

export default class VideoWindow {
   private videoElement;

   private wrapperElement;

   constructor(private videoDialog:VideoDialog, private session) {
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
      this.wrapperElement.attr('data-sid', this.session.sid);

      this.videoDialog.addContainer(this.wrapperElement);
   }

   private onIceConnectionStateChanged = (session, state) => {
      Log.debug('connection state for ' + session.sid, state);

      if (state === 'connected') {
         this.wrapperElement.removeClass('jsxc-establishing');
         this.wrapperElement.addClass('jsxc-ice-connected');
      } else if (state === 'failed') {
         Log.warn('ICE connection failed');

         session.end('failed-transport');
      } else if (state === 'interrupted') {
         //@TODO translate
         //this.videoDialog.setStatus('Connection_interrupted');
      }
   }

   private callAccepted = () => {
      this.wrapperElement.removeClass('jsxc-ringing');
   }

   private callRinging = () => {
      this.videoDialog.setStatus('ringing...', 0);

      this.wrapperElement.removeClass('jsxc-establishing');
      this.wrapperElement.addClass('jsxc-ringing');
   }

   private addStream = (session, stream) => {
      //@REVIEW can a session contain multiple streams?
      Log.debug('Remote stream for session ' + session.sid + ' added.');

      let isVideoDevice = stream.getVideoTracks().length > 0;
      let isAudioDevice = stream.getAudioTracks().length > 0;

      this.videoDialog.setStatus(isVideoDevice ? 'Use remote video device.' : 'No remote video device');
      this.videoDialog.setStatus(isAudioDevice ? 'Use remote audio device.' : 'No remote audio device');

      this.videoElement = $('<video autoplay></video>');
      this.videoElement.appendTo(this.wrapperElement);

      VideoDialog.attachMediaStream(this.videoElement, stream);

      if (isVideoDevice) {
         this.wrapperElement.addClass('jsxc-video-available');
      }

      if (isAudioDevice) {
         this.wrapperElement.addClass('jsxc-audio-available');
      }
   }

   private removeStream = (session) => {
      Log.debug('Remote stream for ' + session.jid + ' removed.');

      VideoDialog.dettachMediaStream(this.videoElement);
   }
}
