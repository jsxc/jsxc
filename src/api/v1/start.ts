import Log from '../../util/Log'
import Client from '../../Client'
import Roster from '../../ui/Roster'
import * as UI from '../../ui/web'
import BaseError from '../../errors/BaseError'
import InvalidParameterError from '../../errors/InvalidParameterError'

export async function startAndPause(boshUrl: string, jid: string, password: string) {
   testMaxOneAccount();

   if (Client.getAccounts().length === 0) {
      Roster.hide();
   }

   let account = await Client.createAccount(boshUrl, jid, password);

   return account.connect(true).then(() => undefined);
}

export function start(boshUrl: string, jid: string, sid: string, rid: string);
export function start(boshUrl: string, jid: string, password: string);
export function start();
export function start() {
   testMaxOneAccount();

   let promise;

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
}

async function startWithCredentials(boshUrl: string, jid: string, password: string) {
   let account = await Client.createAccount(boshUrl, jid, password.toString());

   return connectAndStartUI(account);
}

async function startWithBoshParameters(boshUrl: string, jid: string, sid: string, rid: string) {
   if (!/\/.+$/.test(jid)) {
      return Promise.reject(new InvalidParameterError('We need a Jabber ID with resource.'));
   }

   let account = await Client.createAccount(boshUrl, jid, sid.toString(), rid.toString());

   return connectAndStartUI(account);
}

function connectAndStartUI(account) {
   return account.connect(true).then(function() {
      Client.addAccount(account);

      startUI();
   }).catch((err) => {
      Client.removeAccount(account);

      if (err instanceof BaseError) {
         Log.warn('Instance of BaseErrors', err.toString());

         throw err;
      }

      Log.warn('Unknown error:', err);

      throw 'Unknown error';
   });
}

function testMaxOneAccount() {
   let accounts = Client.getAccounts();

   if (accounts.length > 0 && !Client.isDebugMode()) {
      throw 'Currently we only support one account at a time. If you like to test the experimental multi account feature, please enable debug mode.';
   }
}
