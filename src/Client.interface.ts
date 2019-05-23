import { IJID } from './JID.interface'

export interface IClient {
   init();

   addPreSendMessageHook(hook: (Message, Builder) => void, position?: number);

   hasFocus();

   isExtraSmallDevice(): boolean;

   isDebugMode(): boolean;

   getStorage();

   getAccount(jid: IJID): Account;
   getAccount(uid?: string): Account;

   createAccount(boshUrl: string, jid: string, sid: string, rid: string);
   createAccount(boshUrl: string, jid: string, password: string);

   removeAccount(account: Account);
}
