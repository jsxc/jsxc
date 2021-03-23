import Account from './Account';
import { Call } from './Call';
import { IContact } from "./Contact.interface";

export enum CallState { Pending, Accepted, Declined, Aborted, Ignored }
export type CallType = 'audio' | 'video' | 'stream';

export default class CallManager {
   private calls: { [sessionId: string]: Call } = {};

   constructor(private account: Account) {

   }

   public onIncomingCall(type: CallType, sessionId: string, peer: IContact) {
      if (!this.calls[sessionId]) {
         this.calls[sessionId] = new Call(type, sessionId, peer);

         const storage = this.account.getSessionStorage();
         const key = storage.generateKey('call', sessionId);

         storage.registerHook(key, (newValue: CallState) => {
            if (newValue !== CallState.Pending && this.calls[sessionId].getCurrentState() === CallState.Pending) {
               this.calls[sessionId].abort();
            }
         });
      } else if(this.calls[sessionId].getPeer().getUid() !== peer.getUid()) {
         throw new Error('Duplicated call session id');
      }

      return this.calls[sessionId];
   }
}
