import Account from './Account';
import JID from './JID';
import IStorage from './Storage.interface';
import Client from './Client';
import ClientAvatar from './ClientAvatar';
import RoleAllocator from './RoleAllocator';
import Log from '@util/Log';
import Utils from '@util/Utils';
import * as UI from './ui/web';

export default class AccountManager {
   private accounts = {};

   constructor(private storage: IStorage) {

   }

   public restoreAccounts(): number {
      let accountIds = this.getAccountIds();
      let pendingAccountIds = this.getPendingAccountIds();
      let numberOfAccounts = accountIds.length + pendingAccountIds.length;

      accountIds.forEach(this.initAccount);
      pendingAccountIds.forEach(this.initAccount);

      this.storage.setItem('pendingAccounts', []);
      this.storage.setItem('accounts', Object.keys(this.accounts));

      this.storage.registerHook('accounts', this.accountsHook);

      return numberOfAccounts;
   }

   private initAccount = (id) => {
      if (this.accounts[id]) {
         Log.debug('destroy old account with uid ' + id);

         this.accounts[id].destroy();
      }

      let account = this.accounts[id] = new Account(id);

      Client.getPresenceController().registerAccount(account);
      ClientAvatar.get().registerAccount(account);
      UI.init();

      RoleAllocator.get().waitUntilMaster().then(function() {
         return account.connect();
      }).then(function() {

      }).catch(function(msg) {
         account.connectionDisconnected();

         Log.warn(msg)
      });
   }

   private accountsHook = (newValue, oldValue) => {
      let diff = Utils.diffArray(newValue, oldValue);
      let newAccountIds = diff.newValues;
      let deletedAccountIds = diff.deletedValues;

      newAccountIds.forEach(this.initAccount);

      deletedAccountIds.forEach(id => {
         let account: Account = this.accounts[id];

         if (account) {
            delete this.accounts[account.getUid()];

            account.remove();
         }
      });
   }

   public createAccount(url: string, jid: string, sid: string, rid: string): Promise<Account>;
   public createAccount(url: string, jid: string, password: string): Promise<Account>;
   public createAccount() {
      let account: Account;

      if (!arguments[0]) {
         return Promise.reject('We need an url to create an account');
      } else if (this.getAccount(arguments[1])) {
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

   public getAccount(jid: JID): Account;
   public getAccount(uid?: string): Account;
   public getAccount() {
      let uid;

      if (arguments[0] instanceof JID) {
         uid = arguments[0].bare;
      } else if (arguments[0]) {
         uid = arguments[0];
      } else {
         uid = Object.keys(this.accounts)[0];
      }

      return this.accounts[uid];
   }

   public getAccounts(): Account[] {
      // @REVIEW use of Object.values()
      let accounts = [];

      for (let id in this.accounts) {
         accounts.push(this.accounts[id]);
      }

      return accounts;
   }

   public addAccount(account: Account) {
      if (this.getAccount(account.getUid())) {
         throw new Error('Account with this jid already exists.');
      }

      this.accounts[account.getUid()] = account;

      this.storage.setItem('accounts', Object.keys(this.accounts));
   }

   private getAccountIds(): string[] {
      return this.storage.getItem('accounts') || [];
   }

   public addPendingAccount(account: Account) {
      let uid = account.getUid();
      let pendingAccounts = this.getPendingAccountIds();

      if (pendingAccounts.indexOf(uid) < 0) {
         pendingAccounts.push(uid);

         this.storage.setItem('pendingAccounts', pendingAccounts);
      }
   }

   private getPendingAccountIds(): string[] {
      return this.storage.getItem('pendingAccounts') || []
   }

   public removeAccount(account: Account) {
      let ids = Object.keys(this.accounts).filter(id => id !== account.getUid());

      this.storage.setItem('accounts', ids);

      if (ids.length === 0) {
         Client.getNoticeManager().removeAll();
      }
   }
}
