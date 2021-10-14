import { IContact } from '@src/Contact.interface';
import JID from '@src/JID';
import JingleCallSession from '@src/JingleCallSession';
import JingleHandler from '@connection/JingleHandler';

export function JingleCallFactory(
   jingleHandler: JingleHandler,
   stream: MediaStream,
   type: 'video' | 'audio' | 'screen',
   contact: IContact
) {
   let constraints = {
      offerToReceiveAudio: type === 'video' || type === 'audio' || type === 'screen',
      offerToReceiveVideo: type === 'video' || type === 'screen',
   };

   return async function (resource: string, sessionId?: string) {
      let peerJID = new JID(contact.getJid().bare + '/' + resource);

      let session = <JingleCallSession>await jingleHandler.initiate(peerJID, stream, constraints, sessionId);
      let contactOfflineTimeout = setTimeout(() => {
         session.cancel();
      }, 30000);

      session.on('accepted', () => {
         clearTimeout(contactOfflineTimeout);
      });

      session.on('terminated', () => {
         clearTimeout(contactOfflineTimeout);
      });

      return session;
   };
}
