import { Presence } from './connection/AbstractConnection'
import { Strophe } from './vendor/Strophe'
import Account from './Account'
import Storage from './Storage'
import Log from '@util/Log';

const TARGET_KEY = 'targetPresence';
const CURRENT_KEY = 'currentPresence';
const AGGREGATE = 500;

export default class PresenceController {
   private updateTimeout;

   constructor(private storage: Storage, private getAccounts: () => Account[]) {

   }

   public setTargetPresence(presence: Presence) {
      this.storage.setItem(TARGET_KEY, presence);
   }

   public getTargetPresence(): Presence {
      let presence = this.storage.getItem(TARGET_KEY);

      return typeof presence === 'number' ? presence : Presence.offline;
   }

   public getCurrentPresence(): Presence {
      let presence = this.storage.getItem(CURRENT_KEY);

      return typeof presence === 'number' ? presence : Presence.offline;
   }

   public registerTargetPresenceHook(func: (presence: Presence) => void) {
      this.storage.registerHook(TARGET_KEY, func);
   }

   public unregisterTargetPresenceHook(func: (presence: Presence) => void) {
      this.storage.removeHook(TARGET_KEY, func);
   }

   public registerCurrentPresenceHook(func: (presence: Presence) => void) {
      this.storage.registerHook(CURRENT_KEY, func);
   }

   public registerAccount(account: Account) {
      let sessionStorage = account.getSessionStorage();

      this.updateCurrentPresence();

      //@REVIEW account.registerPresenceHook ???
      sessionStorage.registerHook('presence', () => {
         if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
         }

         this.updateTimeout = setTimeout(() => this.updateCurrentPresence(), AGGREGATE);
      });

      account.registerConnectionHook((status) => {
         if (status === Strophe.Status.DISCONNECTED) {
            Log.info('Presence Controller: account disconnected')
         }
      });
   }

   private updateCurrentPresence() {
      let commonPresence = this.getCommonPresence();

      if (commonPresence !== false) {
         this.storage.setItem(CURRENT_KEY, commonPresence);
      }
   }

   private getCommonPresence(): Presence | false {
      let isSamePresence = true;
      let commonPresence;
      let accounts = this.getAccounts();

      //@REVIEW refactor
      if (accounts.length === 0) {
         this.setTargetPresence(Presence.offline);

         return Presence.offline;
      }

      accounts.forEach((account) => {
         let presence = account.getPresence();

         if (typeof commonPresence === 'undefined') {
            commonPresence = presence;
         } else if (commonPresence !== presence) {
            isSamePresence = false;
         }
      });

      return isSamePresence ? commonPresence : false;
   }
}
