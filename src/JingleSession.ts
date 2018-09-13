import Account from './Account'
import JingleCallSession from './JingleCallSession'
import JingleStreamSession from './JingleStreamSession';

export default class JingleSession {

   public static create(account: Account, session) {
      let sessionType = JingleSession.getSessionType(session);

      if (sessionType === 'FileTransferSession') {
         throw new Error('We are currently not supporting file transfer sessions.');
      } else if (sessionType === 'CallSession') {
         return new JingleCallSession(account, session);
      } else if (sessionType === 'StreamSession') {
         return new JingleStreamSession(account, session);
      } else {
         throw new Error('Could not create jingle session. Unknown session type.');
      }
   }

   private static getSessionType(session) {
      let sessionType = (session.constructor) ? session.constructor.name : null;

      if (sessionType === 'MediaSession') {
         sessionType = JingleSession.determineMediaSessionType(session);
      }

      return sessionType;
   }

   private static determineMediaSessionType(session) {
      let reqMedia = false;

      $.each(session.pc.remoteDescription.contents, function() {
         if (this.senders === 'both' && ['audio', 'video'].indexOf(this.name) > -1) {
            reqMedia = true;
         }
      });

      return reqMedia ? 'CallSession' : 'StreamSession';
   }
}
