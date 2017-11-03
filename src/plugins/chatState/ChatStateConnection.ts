import * as Namespace from '../../connection/xmpp/namespace'
import JID from '../../JID'
import { STATE } from './State'

export default class ChatStateConnection {
   constructor(private send, private sendIQ) {

   }

   public sendPaused(to: JID, type: 'chat' | 'groupchat' = 'chat') {
      this.sendState(STATE.PAUSED, to, type);
   }

   public sendComposing(to: JID, type: 'chat' | 'groupchat' = 'chat') {
      this.sendState(STATE.COMPOSING, to, type);
   }

   private sendState(state: STATE, to: JID, type: 'chat' | 'groupchat' = 'chat') {
      let msg = $msg({
         to: to.full,
         type: type
      }).c(state, {
         xmlns: Namespace.get('CHATSTATES')
      });

      this.send(msg);
   }
}
