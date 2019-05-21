import Log from './util/Log'
import JingleHandler from './connection/JingleHandler'
import UserMedia from './UserMedia'
import Translation from './util/Translation'
import Notification from './Notification'
import JingleMediaSession from './JingleMediaSession';

export default class JingleCallSession extends JingleMediaSession {

   public onOnceIncoming() {
      Notification.notify({
         title: Translation.t('Incoming_call'),
         message: Translation.t('from_sender') + this.peerContact.getName(),
         source: this.peerContact
      });

      // send signal to partner
      this.session.ring();
   }

   protected onIncoming() {
      Log.debug('incoming call from ' + this.session.peerID);

      let videoDialog = JingleHandler.getVideoDialog();
      let mediaRequested = this.getMediaRequest();

      Promise.race([
         videoDialog.showCallDialog(this).then(() => {
            return UserMedia.request(mediaRequested);
         }),
         new Promise((resolve, reject) => {
            this.on('terminated', () => {
               reject('aborted')
            });

            this.on('aborted', () => {
               reject('aborted')
            });
         })
      ]).then((stream: MediaStream) => {
         videoDialog.addSession(this);
         videoDialog.showVideoWindow(stream);

         this.session.addStream(stream);
         this.session.accept();
      }).catch((reason) => {

         //@TODO hide user media request overlay

         //@TODO post reason to chat window
         if (reason !== 'aborted') {
            Log.warn('Decline call', reason)

            this.session.decline();
         }
      });
   }

   public getMediaRequest(): Array<'audio' | 'video'> {
      let mediaRequested = [];
      let contents = this.session.pc.remoteDescription.contents;

      for (let content of contents) {
         if (content.senders === 'both' && ['audio', 'video'].indexOf(content.application.media) > -1) {
            mediaRequested.push(content.application.media);
         }
      }

      return mediaRequested
   }
}
