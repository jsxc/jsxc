import Account from './Account'
import Message from './Message'
import {AbstractPlugin, IPlugin} from './plugin/AbstractPlugin'
import Storage from './Storage';
import * as UI from './ui/web'
import JID from './JID'
import Roster from './ui/Roster'
import ChatWindowList from './ui/ChatWindowList'
import RoleAllocator from './RoleAllocator'
import SortedPersistentMap from './util/SortedPersistentMap'
import {NoticeManager} from './NoticeManager'
import PluginRepository from './plugin/PluginRepository'
import Log from './util/Log'

export default class Client {
   private static storage;

   private static accounts = {};

   private static noticeManager;

   public static init() {
      let roleAllocator = RoleAllocator.get();
      let accountIds = Client.getStorage().getItem('accounts') || [];

      Client.noticeManager = new NoticeManager(Client.getStorage());

      accountIds.forEach(function(id) {
         Client.accounts[id] = new Account(id);

         roleAllocator.waitUntilMaster().then(function(){
            return Client.accounts[id].connect();
         }).then(function(){

         }).catch(function(msg){
            Client.accounts[id].remove();

            console.warn(msg)
         });
      });
   }

   public static getVersion():string {
      return '4.0.0';
   }

   public static addPlugin(Plugin:IPlugin) {
      try {
         PluginRepository.add(Plugin);
      } catch(err) {
         Log.warn('Error while adding Plugin: ' + err);
      }
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

   public static getNoticeManager():NoticeManager {
      return Client.noticeManager;
   }

   public static getAccount(jid:JID):Account;
   public static getAccount(uid?:string):Account;
   public static getAccount() {
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
         return Promise.reject('Wrong number of arguments');
      }

      //@TODO prevent creation of multiple accounts with the same jid

      return account.connect().then(function(){
         Client.addAccount(account);
      });
   }

   public static removeAccount(account:Account) {
      delete Client.accounts[account.getUid()];

      Client.save();

      if (Object.keys(Client.accounts).length === 0) {
         Roster.get().setNoConnection();
      }
   }

   private static addAccount(account:Account) {
      Client.accounts[account.getUid()] = account;

      Client.save()
   }

   private static save() {
      Client.getStorage().setItem('accounts', Object.keys(this.accounts));
   }
}
