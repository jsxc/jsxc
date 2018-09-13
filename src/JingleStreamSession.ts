import JingleHandler from '@connection/JingleHandler';
import Log from '@util/Log';
import JingleAbstractSession from './JingleAbstractSession';
import Notification from './Notification';
import Translation from '@util/Translation';
import JID from './JID';

export default class JingleStreamSession extends JingleAbstractSession {

   public onOnceIncoming() {
      let peerJID = new JID(this.session.peerID);
      let contact = this.account.getContact(peerJID);

      // let chatWindow = contact.getChatWindow();
      // chatWindow.postScreenMessage(Translation.t('Incoming_stream'), session.sid);

      Notification.notify({
         title: Translation.t('Incoming_stream'),
         message: Translation.t('from_sender') + contact.getName(),
         source: contact
      });

      // send signal to partner
      this.session.ring();
   }

   protected onIncoming() {
      Log.debug('incoming stream from ' + this.session.peerID);

      let videoDialog = JingleHandler.getVideoDialog();
      videoDialog.addSession(this.session);

      videoDialog.showCallDialog(this).then(() => {
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
