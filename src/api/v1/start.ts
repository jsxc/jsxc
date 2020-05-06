import Log from '../../util/Log'
import Client from '../../Client'
import * as UI from '../../ui/web'
import BaseError from '../../errors/BaseError'
import InvalidParameterError from '../../errors/InvalidParameterError'
import Account from '@src/Account';

export async function startAndPause(boshUrl: string, jid: string, password: string): Promise<void> {
   let accountManager = Client.getAccountManager();
   let account = await accountManager.createAccount(boshUrl, jid, password);

   return account.connect(true).then(() => {
      accountManager.addPendingAccount(account);
   });
}

export function start(url: string, jid: string, sid: string, rid: string): Promise<void>;
export function start(url: string, jid: string, password: string): Promise<void>;
export function start(): Promise<any>;
export function start() {
   let promise: Promise<any>;

   switch (arguments.length) {
      case 0: promise = startUI();
              break;
      case 3: promise = startWithCredentials(arguments[0], arguments[1], arguments[2]);
              break;
      case 4: promise = startWithBoshParameters(arguments[0], arguments[1], arguments[2], arguments[3]);
              break;
      default:
         promise = Promise.reject(new InvalidParameterError('Wrong number of parameters.'));
   }

   return promise;
}

function startUI() {
   UI.init();

   return Promise.resolve();
}

async function startWithCredentials(url: string, jid: string, password: string) {
   let account = await Client.getAccountManager().createAccount(url, jid, password.toString());

   return connectAndStartUI(account);
}

async function startWithBoshParameters(url: string, jid: string, sid: string, rid: string) {
   if (!/\/.+$/.test(jid)) {
      return Promise.reject(new InvalidParameterError('We need a Jabber ID with resource.'));
   }

   let account = await Client.getAccountManager().createAccount(url, jid, sid.toString(), rid.toString());

   return connectAndStartUI(account);
}

function connectAndStartUI(account: Account): Promise<void> {
   let accountManager = Client.getAccountManager();

   return account.connect(true).then(function() {
      accountManager.addAccount(account);

      startUI();
   }).catch((err) => {
      accountManager.removeAccount(account);

      if (err instanceof BaseError) {
         Log.warn('Instance of BaseErrors', err.toString());

         throw err;
      }

      Log.warn('Unknown error:', err);

      throw new Error('Unknown error');
   });
}
