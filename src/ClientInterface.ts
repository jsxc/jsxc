import { JIDInterface } from './JIDInterface'

export interface ClientInterface {
   init();

   addPreSendMessageHook(hook: (Message, Builder) => void, position?: number);

   hasFocus();

   isExtraSmallDevice(): boolean;

   isDebugMode(): boolean;

   getStorage();

   getAccount(jid: JIDInterface): Account;
   getAccount(uid?: string): Account;

   createAccount(boshUrl: string, jid: string, sid: string, rid: string);
   createAccount(boshUrl: string, jid: string, password: string);

   removeAccount(account: Account);
}
