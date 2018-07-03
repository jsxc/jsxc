import Contact from '../../Contact'
import Log from '../../util/Log'
import UserMedia from '../../UserMedia'
import { VideoDialog } from '../VideoDialog'
import Account from '../../Account'
import Translation from '../../util/Translation'
import IceServers from '../../IceServers'

export function startCall(contact: Contact, account: Account, type: 'video' | 'audio' | 'screen' = 'video') {
   let peerJID = contact.getJid();

   if (!peerJID.resource) {
      Log.debug('We need a full jid');
      return;
   }

   //@TODO use IceServers.get()

   let reqMedia = type === 'audio' ? ['audio'] : (type === 'screen' ? ['screen'] : ['audio', 'video']);

   UserMedia.request(reqMedia).then((stream) => {
      let jingleHandler = account.getConnection().getJingleHandler();
      let videoDialog = new VideoDialog();

      videoDialog.showVideoWindow(stream);
      videoDialog.setStatus('Initiate call');

      let constraints = {
         mandatory: {
            'OfferToReceiveAudio': type === 'video' || type === 'audio',
            'OfferToReceiveVideo': type === 'video'
         }
      }

      let session = jingleHandler.initiate(peerJID, stream, constraints);

      // flag session as call
      session.call = true;

      videoDialog.addSession(session);

      //@TODO post $.t('Call_started')
   }).catch(([msg, err]) => {
      contact.addSystemMessage(`${Translation.t('Media_failure')}: ${msg} (${err.name})`);
   });

   //@TODO add timeout (buddy maybe offline)
}
