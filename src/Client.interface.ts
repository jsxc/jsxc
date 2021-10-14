import Account from './Account';
import { IJID } from './JID.interface';

export interface IClient {
   init(): void;

   addPreSendMessageHook(hook: (Message, Builder) => void, position?: number): void;

   hasFocus(): void;

   isExtraSmallDevice(): boolean;

   isDebugMode(): boolean;

   getStorage(): void;

   getAccount(jid: IJID): Account;
   getAccount(uid?: string): Account;

   createAccount(boshUrl: string, jid: string, sid: string, rid: string): void;
   createAccount(boshUrl: string, jid: string, password: string): void;

   removeAccount(account: Account): void;
}
