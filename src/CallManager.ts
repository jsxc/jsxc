import JingleHandler from '@connection/JingleHandler';
import Log from '@util/Log';
import Account from './Account';
import { Call } from './Call';
import { IContact } from './Contact.interface';
import { JINGLE_FEATURES } from './JingleAbstractSession';
import { JingleCallFactory } from './JingleCallFactory';
import JingleCallSession from './JingleCallSession';

export enum CallState {
   Pending,
   Accepted,
   Declined,
   Aborted,
   Ignored,
   Failed,
}
export type CallType = 'audio' | 'video' | 'stream';

function cancelAllOtherSessions(sessions: JingleCallSession[], exception: JingleCallSession) {
   sessions.forEach((session, index) => {
      if (index !== sessions.indexOf(exception)) {
         session.cancel();
      }
   });
}

export default class CallManager {
   private incomingCalls: { [sessionId: string]: Call } = {};

   constructor(private account: Account) {}

   public onIncomingCall(type: CallType, sessionId: string, peer: IContact) {
      //@TODO decline calls if there is an active call

      if (!this.incomingCalls[sessionId]) {
         this.incomingCalls[sessionId] = new Call(type, sessionId, peer);

         const storage = this.account.getSessionStorage();
         const key = storage.generateKey('call', sessionId);

         storage.registerHook(key, (newValue: CallState) => {
            if (
               newValue !== CallState.Pending &&
               this.incomingCalls[sessionId].getCurrentState() === CallState.Pending
            ) {
               this.incomingCalls[sessionId].abort();
            }
         });
      } else if (this.incomingCalls[sessionId].getPeer().getUid() !== peer.getUid()) {
         throw new Error('Duplicated call session id');
      }

      return this.incomingCalls[sessionId];
   }

   public async call(
      contact: IContact,
      type: 'video' | 'audio' | 'screen',
      stream: MediaStream
   ): Promise<JingleCallSession | CallState | false> {
      let resources = await contact.getCapableResources(JINGLE_FEATURES[type]);

      if (resources.length === 0) {
         return false;
      }

      let sessionId: string;
      const jingleHandler = this.account.getConnection().getJingleHandler();
      const initiateCall = JingleCallFactory(jingleHandler, stream, type, contact);

      [, , resources, sessionId] = await this.account
         .getPipe<[IContact, 'video' | 'audio' | 'screen', string[], string]>('call')
         .run(contact, type, resources, undefined);

      if (resources.length === 0) {
         if (sessionId) {
            return CallState.Declined;
         } else {
            // call timed out
            return CallState.Aborted;
         }
      }

      const sessions: JingleCallSession[] = [];

      for (let resource of resources) {
         try {
            sessions.push(await initiateCall(resource, sessionId));
         } catch (err) {
            Log.warn(`Error while calling ${resource}`, err);
         }
      }

      if (sessions.length === 0) {
         Log.warn('Could not establish a single session');

         return false;
      }

      const respondPromises: Promise<CallState | JingleCallSession>[] = [];

      for (let session of sessions) {
         respondPromises.push(
            new Promise(resolve => {
               session.on('accepted', () => {
                  cancelAllOtherSessions(sessions, session);

                  resolve(session);
               });

               session.on('terminated', ({ condition }) => {
                  if (condition === 'decline') {
                     cancelAllOtherSessions(sessions, session);

                     resolve(CallState.Declined);
                  }
               });
            })
         );
      }

      return Promise.race(respondPromises);
   }

   public terminateAll() {
      JingleHandler.terminateAll('success');

      this.account.getPipe<[sessionId?: string]>('terminateCall').run();
   }
}
