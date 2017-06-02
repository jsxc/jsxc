import Account from './Account'
import Message from './Message'
import {PluginInterface} from './PluginInterface'
import Storage from './Storage';
import * as UI from './ui/web'
import JID from './JID'
import Roster from './ui/Roster'
import RoleAllocator from './RoleAllocator'

export default class Client {
   private static storage;

   private static accounts = {};

   public static init() {
      let roleAllocator = RoleAllocator.get();
      let accountIds = Client.getStorage().getItem('accounts') || [];

      accountIds.forEach(function(id) {
         Client.accounts[id] = new Account(id);

         roleAllocator.waitUntilMaster().then(function(){
            return Client.accounts[id].connect();
         }).then(function(){

         }).catch(function(msg){
            Roster.get().setNoConnection();

            console.warn(msg)

            delete Client.accounts[id];
            Client.save();
         });
      });
   }

   public static addConnectionPlugin(plugin:PluginInterface) {

   }

   public static addPreSendMessageHook(hook:(Message, Builder)=>void, position?:number) {

   }

   public static hasFocus() {

   }

   public static isExtraSmallDevice():boolean {
      return $(window).width() < 500;
   }

   public static isDebugMode():boolean {
      return Client.getStorage().getItem('debug') === true;
   }

   public static getStorage() {
      if (!Client.storage) {
         Client.storage = new Storage();
      }

      return Client.storage;
   }

   public static getAccout(jid:JID);
   public static getAccout(uid?:string);
   public static getAccout() {
      let uid;

      if (arguments[0] instanceof JID) {
         uid = arguments[0].bare;
      } else if (arguments[0]) {
         uid = arguments[0];
      } else {
         uid = Object.keys(Client.accounts)[0];
      }

      return Client.accounts[uid];
   }

   public static createAccount(boshUrl: string, jid: string, sid: string, rid:string);
   public static createAccount(boshUrl: string, jid: string, password: string);
   public static createAccount() {
      let account;

      if (arguments.length === 4) {
         account = new Account(arguments[0], arguments[1], arguments[2], arguments[3]);
      } else if (arguments.length === 3) {
         account = new Account(arguments[0], arguments[1], arguments[2]);
      } else {
         return Promise.reject(null);
      }

      return account.connect().then(function(){
         Client.addAccount(account);
      });
   }

   private static addAccount(account:Account) {
      Client.accounts[account.getUid()] = account;

      Client.save()
   }

   private static save() {
      Client.getStorage().setItem('accounts', Object.keys(this.accounts));
   }
}
