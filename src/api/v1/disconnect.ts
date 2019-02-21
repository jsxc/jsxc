import Client from '@src/Client';
import { Presence } from '@connection/AbstractConnection';

export function disconnect() {
   return new Promise(resolve => {
      Client.getPresenceController().registerCurrentPresenceHook((presence) => {
         if (presence === Presence.offline) {
            resolve();
         }
      });

      if (Client.getAccountManager().getAccount()) {
         Client.getPresenceController().setTargetPresence(Presence.offline);
      } else {
         resolve();
      }
   });
}
