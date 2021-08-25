import JingleAbstractSession from './JingleAbstractSession';
import { IOTalkJingleMediaSession } from '@vendor/Jingle.interface';
import { IMediaSession } from './MediaSession.interface';

export default abstract class JingleMediaSession extends JingleAbstractSession implements IMediaSession {
   protected session: IOTalkJingleMediaSession;

   public getRemoteStreams(): MediaStream[] {
      return this.session.pc.getRemoteStreams();
   }
}
