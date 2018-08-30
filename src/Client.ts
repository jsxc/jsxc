import Account from './Account'
import { IPlugin } from './plugin/AbstractPlugin'
import Storage from './Storage'
import JID from './JID'
import Roster from './ui/Roster'
import RoleAllocator from './RoleAllocator'
import { NoticeManager } from './NoticeManager'
import PluginRepository from './plugin/PluginRepository'
import Log from './util/Log'
import Options from './Options'
import PresenceController from './PresenceController'
import PageVisibility from './PageVisibility'
import ChatWindowList from './ui/ChatWindowList';
import Utils from '@util/Utils';

export default class Client {
   private static storage;

   private static accounts = {};

   private static noticeManager;

   private static presenceController: PresenceController;

   private static initialized = false;

   public static init(options?): number {
      if (Client.initialized) {
         return;
      }

      Client.initialized = true;

      PageVisibility.init();

      let storage = Client.getStorage();
      let accountIds = storage.getItem('accounts') || [];
      let numberOfAccounts = accountIds.length;

      if (typeof options === 'object' && options !== null) {
         Options.get().overwriteDefaults(options);
      }

      Client.presenceController = new PresenceController(storage, Client.getAccounts);
      Client.noticeManager = new NoticeManager(Client.getStorage());

      accountIds.forEach(Client.initAccount);

      storage.registerHook('accounts', (newValue, oldValue) => {
         let diff = Utils.diffArray(newValue, oldValue);
         let newAccountIds = diff.newValues;
         let deletedAccountIds = diff.deletedValues;

         //@TODO jsxc.startAndPause
         newAccountIds.forEach(Client.initAccount);

         deletedAccountIds.forEach(id => {
            let account: Account = Client.accounts[id];

            if (account) {
               delete Client.accounts[account.getUid()];

               account.remove();
            }
         });
      });

      return numberOfAccounts;
   }

   private static initAccount = (id) => {
      let account = Client.accounts[id] = new Account(id);

      Client.presenceController.registerAccount(account);

      RoleAllocator.get().waitUntilMaster().then(function() {
         return account.connect();
      }).then(function() {

      }).catch(function(msg) {
         Client.accounts[id].connectionDisconnected();

         Log.warn(msg)
      });
   }

   public static getVersion(): string {
      return '4.0.0';
   }

   public static addPlugin(Plugin: IPlugin) {
      try {
         PluginRepository.add(Plugin);
      } catch (err) {
         Log.warn('Error while adding Plugin: ' + err);
      }
   }

   public static hasTabFocus() {
      let hasFocus = true;

      if (typeof document.hasFocus === 'function') {
         hasFocus = document.hasFocus();
      }

      return hasFocus;
   }

   public static isVisible() {
      return PageVisibility.isVisible();
   }

   public static isExtraSmallDevice(): boolean {
      return $(window).width() < 500;
   }

   public static isDebugMode(): boolean {
      return Client.getStorage().getItem('debug') === true;
   }

   public static getStorage(): Storage {
      if (!Client.storage) {
         Client.storage = new Storage();
      }

      return Client.storage;
   }

   public static getNoticeManager(): NoticeManager {
      return Client.noticeManager;
   }

   public static getPresenceController(): PresenceController {
      return Client.presenceController;
   }

   public static getChatWindowList(): ChatWindowList {
      return ChatWindowList.get();
   }

   public static getAccount(jid: JID): Account;
   public static getAccount(uid?: string): Account;
   public static getAccount() {
      let uid;

      if (arguments[0] instanceof JID) {
         uid = arguments[0].bare;
      } else if (arguments[0]) {
         uid = arguments[0];
      } else {
         uid = Object.keys(Client.accounts)[0];
      }
      console.log('accounts', Client.accounts);
      return Client.accounts[uid];
   }

   public static getAccounts(): Array<Account> {
      // @REVIEW use of Object.values()
      let accounts = [];

      for (let id in Client.accounts) {
         accounts.push(Client.accounts[id]);
      }

      return accounts;
   }

   public static createAccount(boshUrl: string, jid: string, sid: string, rid: string);
   public static createAccount(boshUrl: string, jid: string, password: string);
   public static createAccount() {
      let account;

      if (Client.getAccount(arguments[1])) {
         return Promise.reject('Account with this jid already exists.');
      } else if (arguments.length === 4) {
         account = new Account(arguments[0], arguments[1], arguments[2], arguments[3]);
      } else if (arguments.length === 3) {
         account = new Account(arguments[0], arguments[1], arguments[2]);
      } else {
         return Promise.reject('Wrong number of arguments');
      }

      return Promise.resolve(account);
   }

   public static removeAccount(account: Account) {
      delete Client.accounts[account.getUid()];

      Client.save();

      if (Object.keys(Client.accounts).length === 0) {
         Roster.get().setNoConnection();

         this.getNoticeManager().removeAll();
      }
   }

   public static getOptions(): Options {
      return Options.get();
   }

   public static getOption(key: string) {
      return Client.getOptions().get(key);
   }

   public static setOption(key: string, value) {
      Client.getOptions().set(key, value);
   }

   public static addAccount(account: Account) {
      if (Client.getAccount(account.getUid())) {
         throw 'Account with this jid already exists.';
      }

      Client.accounts[account.getUid()] = account;

      Client.presenceController.registerAccount(account);

      Client.save()
   }

   private static save() {
      Client.getStorage().setItem('accounts', Object.keys(Client.accounts));
   }

}
