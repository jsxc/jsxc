import { IContact } from '@src/Contact.interface';
import Log from '../../util/Log'
import UserMedia from '../../UserMedia'
import { VideoDialog } from '../VideoDialog'
import Account from '../../Account'
import Translation from '../../util/Translation'
import JID from '../../JID';
import JingleCallSession from '@src/JingleCallSession';
import JingleHandler from '@connection/JingleHandler';
import { JINGLE_FEATURES } from '@src/JingleAbstractSession';

export async function startCall(contact: IContact, account: Account, type: 'video' | 'audio' | 'screen' = 'video') {
   let resources = await contact.getCapableResources(JINGLE_FEATURES[type]);

   if (resources.length === 0) {
      Log.debug('We need a full jid');

      contact.addSystemMessage(`No distinct JID available.`);

      return;
   }

   let reqMedia = type === 'audio' ? ['audio'] : (type === 'screen' ? ['screen', 'audio'] : ['audio', 'video']);

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

   let initiateCall = CallFactory(jingleHandler, stream, type, contact, videoDialog);
   let sessions: JingleCallSession[] = [];

   for (let resource of resources) {
      try {
         sessions.push(await initiateCall(resource));
      } catch (err) {
         Log.warn(`Error while calling ${resource}`, err);
      }
   }

   if (sessions.length === 0) {
      Log.warn('Could not establish a single session');

      videoDialog.setStatus('No connection possible');

      setTimeout(() => {
         videoDialog.close();
      }, 2000);
   }

   for (let session of sessions) {
      session.on('accepted', () => {
         cancelAllOtherSessions(sessions, session);

         sessions = [];
      });

      session.on('terminated', ({condition}) => {
         if (condition === 'decline') {
            cancelAllOtherSessions(sessions, session);
         }
      });
   }
}

function cancelAllOtherSessions(sessions: JingleCallSession[], exception: JingleCallSession) {
   sessions.forEach((session, index) => {
      if (index !== sessions.indexOf(exception)) {
         session.cancel();
      }
   });
}

function CallFactory(jingleHandler: JingleHandler, stream: MediaStream, type, contact: IContact, videoDialog: VideoDialog) {
   let constraints = {
      offerToReceiveAudio: type === 'video' || type === 'audio' || type === 'screen',
      offerToReceiveVideo: type === 'video' || type === 'screen',
   }

   return async function(resource: string) {
      let peerJID = new JID(contact.getJid().bare + '/' + resource);

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

      return session;
   }
}
