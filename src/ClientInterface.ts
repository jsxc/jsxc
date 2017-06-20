import {JIDInterface} from './JIDInterface'
import {PluginInterface} from './PluginInterface'

export interface ClientInterface {
   init();

   addConnectionPlugin(plugin:PluginInterface);

   addPreSendMessageHook(hook:(Message, Builder)=>void, position?:number);

   hasFocus();

   isExtraSmallDevice():boolean;

   isDebugMode():boolean;

   getStorage();

   getAccout(jid:JIDInterface):Account;
   getAccout(uid?:string):Account;

   createAccount(boshUrl: string, jid: string, sid: string, rid:string);
   createAccount(boshUrl: string, jid: string, password: string);

   removeAccount(account:Account);
}
