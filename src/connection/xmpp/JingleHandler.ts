import JingleHandler from '../JingleHandler'
import JID from '../../JID'
import Translation from '../../util/Translation'
import Notification from '../../Notification'

export default class XMPPJingleHandler extends JingleHandler {
   protected onIncomingCall(session) {
      super.onIncomingCall(session);

      let peerJID = new JID(session.peerID);
      let contact = this.account.getContact(peerJID);

      let chatWindow = this.account.openChatWindow(contact);

      // chatWindow.postScreenMessage(Translation.t('Incoming_call'), session.sid);

      Notification.notify({
         title: Translation.t('Incoming_call'),
         message: Translation.t('from_sender') + contact.getName(),
         source: contact
      });

      // send signal to partner
      session.ring();
   }
}
