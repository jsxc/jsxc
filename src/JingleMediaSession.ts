import JingleAbstractSession from './JingleAbstractSession';
import { OTalkJingleMediaSession } from '@vendor/Jingle.interface';

export default abstract class JingleMediaSession extends JingleAbstractSession {
   protected session: OTalkJingleMediaSession;

   public getRemoteStreams(): MediaStream[] {
      return this.session.pc.getRemoteStreams();
   }
}
