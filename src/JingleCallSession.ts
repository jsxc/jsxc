import Log from './util/Log';
import JingleHandler from './connection/JingleHandler';
import UserMedia from './UserMedia';
import JingleMediaSession from './JingleMediaSession';
import { CallState } from './CallManager';

export default class JingleCallSession extends JingleMediaSession {
   public onOnceIncoming() {
      // send signal to partner
      this.session.ring();
   }

   protected onIncoming() {
      Log.debug('incoming call from ' + this.session.peerID);

      let videoDialog = JingleHandler.getVideoDialog();
      let mediaRequested = this.getMediaRequest();

      const callManager = this.account.getCallManager();
      const callType = this.getCallType();
      const peer = this.getPeer();

      const call = callManager.onIncomingCall(callType, this.session.sid, peer);

      this.on('terminated', () => {
         call.abort();
      });

      this.on('aborted', () => {
         call.abort();
      });

      call
         .getState()
         .then(state => {
            if (state === CallState.Accepted) {
               return UserMedia.request(mediaRequested);
            }

            throw state;
         })
         .then((stream: MediaStream) => {
            videoDialog.addSession(this);
            videoDialog.showVideoWindow(stream);

            this.session.addStream(stream);
            this.session.accept();
         })
         .catch(reason => {
            //@TODO hide user media request overlay

            //@TODO post reason to chat window
            if (reason !== CallState.Aborted && reason !== CallState.Ignored) {
               if (reason !== CallState.Declined) {
                  Log.warn('Error on incoming call', reason);
               }

               this.session.decline();
            }
         });
   }

   public getMediaRequest(): ('audio' | 'video')[] {
      let mediaRequested = [];
      let contents = this.session.pc.remoteDescription.contents;

      for (let content of contents) {
         if (content.senders === 'both' && ['audio', 'video'].indexOf(content.application.media) > -1) {
            mediaRequested.push(content.application.media);
         }
      }

      return mediaRequested;
   }
}
