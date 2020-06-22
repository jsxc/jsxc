import JingleHandler from '@connection/JingleHandler';
import Log from '@util/Log';
import JingleMediaSession from './JingleMediaSession';
import Notification from './Notification';
import Translation from '@util/Translation';
import { SOUNDS } from './CONST';

export default class JingleStreamSession extends JingleMediaSession {

   public onOnceIncoming() {
      Notification.notify({
         title: Translation.t('Incoming_stream'),
         message: Translation.t('from_sender') + this.peerContact.getName(),
         source: this.peerContact,
      });

      Notification.playSound(SOUNDS.CALL, true, true);

      this.on('terminated', () => {
         Notification.stopSound();
      });

      this.on('aborted', () => {
         Notification.stopSound();
      });

      this.on('adopt', () => {
         Notification.stopSound();
      });

      // send signal to partner
      this.session.ring();
   }

   protected onIncoming() {
      Log.debug('incoming stream from ' + this.session.peerID);

      let videoDialog = JingleHandler.getVideoDialog();

      videoDialog.showCallDialog(this).then(() => {
         videoDialog.addSession(this);
         videoDialog.showVideoWindow();

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

   public getMediaRequest() {
      return [];
   }
}
