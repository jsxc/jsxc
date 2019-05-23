import Account from './Account'
import JingleCallSession from './JingleCallSession'
import JingleStreamSession from './JingleStreamSession';
import { IOTalkJingleSession } from '@vendor/Jingle.interface';

const MEDIA_SESSION = 'MediaSession';
const CALL_SESSION = 'CallSession';
const FILE_TRANSFER_SESSION = 'FileTransferSession';
const STREAM_SESSION = 'StreamSession';

export default class JingleSession {

   public static create(account: Account, session: IOTalkJingleSession) {
      let sessionType = JingleSession.getSessionType(session);

      if (sessionType === FILE_TRANSFER_SESSION) {
         throw new Error('We are currently not supporting file transfer sessions.');
      } else if (sessionType === CALL_SESSION) {
         return new JingleCallSession(account, session);
      } else if (sessionType === STREAM_SESSION) {
         return new JingleStreamSession(account, session);
      } else {
         throw new Error('Could not create jingle session. Unknown session type: ' + sessionType);
      }
   }

   private static getSessionType(session: IOTalkJingleSession) {
      let sessionType = (session.constructor) ? session.constructor.name : null;

      if (sessionType === MEDIA_SESSION) {
         sessionType = JingleSession.determineMediaSessionType(session);
      }

      return sessionType;
   }

   private static determineMediaSessionType(session: IOTalkJingleSession) {
      let reqMedia = false;
      let description = session.isInitiator ? session.pc.localDescription : session.pc.remoteDescription;

      description.contents.forEach(content => {
         let audioOrVideoRequested = ['audio', 'video'].indexOf(content.name) > -1 || ['audio', 'video'].indexOf(content.application.media) > -1;

         if (content.senders === 'both' && audioOrVideoRequested) {
            reqMedia = true;
         }
      });

      return reqMedia ? CALL_SESSION : STREAM_SESSION;
   }
}
