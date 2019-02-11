import { IContact } from '@src/Contact.interface';
import Log from '../../util/Log'
import UserMedia from '../../UserMedia'
import { VideoDialog } from '../VideoDialog'
import Account from '../../Account'
import Translation from '../../util/Translation'
import JID from '../../JID';
import JingleCallSession from '@src/JingleCallSession';

export async function startCall(contact: IContact, account: Account, type: 'video' | 'audio' | 'screen' = 'video') {
   let peerJID = contact.getJid();

   if (!peerJID.resource) {
      //@REVIEW call all resources

      let resources = contact.getResources();

      if (resources.length === 1) {
         peerJID = new JID(peerJID.bare + '/' + resources[0]);
      } else {
         Log.debug('We need a full jid');

         contact.addSystemMessage(`No distinct JID available.`);

         return;
      }
   }

   //@TODO use IceServers.get()

   let reqMedia = type === 'audio' ? ['audio'] : (type === 'screen' ? ['screen'] : ['audio', 'video']);

   let stream: MediaStream;

   try {
      stream = await UserMedia.request(reqMedia);
   } catch ([msg, err]) {
      contact.addSystemMessage(`${Translation.t('Media_failure')}: ${msg} (${err.name})`);

      return;
   }

   let jingleHandler = account.getConnection().getJingleHandler();
   let videoDialog = new VideoDialog();

   videoDialog.showVideoWindow(stream);
   videoDialog.setStatus('Initiate call');

   let constraints = {
      offerToReceiveAudio: type === 'video' || type === 'audio',
      offerToReceiveVideo: type === 'video' || type === 'screen',
   }

   let session = <JingleCallSession> await jingleHandler.initiate(peerJID, stream, constraints);
   let contactOfflineTimeout = setTimeout(() => {
      session.cancel();

      contact.addSystemMessage(Translation.t('Couldnt_establish_connection'));
   }, 30000);

   session.on('accepted', () => {
      clearTimeout(contactOfflineTimeout);

      if (type === 'screen') {
         videoDialog.minimize();
      }
   });

   session.on('terminated', () => {
      clearTimeout(contactOfflineTimeout);
   });

   videoDialog.addSession(session);
}
