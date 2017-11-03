import Contact from '../../Contact'
import Log from '../../util/Log'
import UserMedia from '../../UserMedia'
import { VideoDialog } from '../VideoDialog'
import Account from '../../Account'
import IceServers from '../../IceServers'

export function startCall(contact: Contact, account: Account) {
   let peerJID = contact.getJid();

   if (!peerJID.resource) {
      Log.debug('We need a full jid');
      return;
   }

   //@TODO use IceServers.get()

   UserMedia.request().then((stream) => {
      let jingleHandler = account.getConnection().getJingleHandler();
      let videoDialog = new VideoDialog();

      videoDialog.showVideoWindow(stream);
      videoDialog.setStatus('Initiate call');

      let session = jingleHandler.initiate(peerJID, stream);

      // flag session as call
      session.call = true;

      videoDialog.addSession(session);

      //@TODO post $.t('Call_started')
   }).catch(() => {

   });

   //@TODO add timeout (buddy maybe offline)
}
