import Log from './util/Log';
import * as UI from './ui/web'
import Client from './Client'

Client.init();

export function start(boshUrl: string, jid: string, sid: string, rid: string);
export function start(boshUrl: string, jid: string, password: string);
export function start();
export function start() { console.log('api.start', arguments)
   switch (arguments.length) {
      case 0: startUI();
         break;
      case 3: startWithCredentials(arguments[0], arguments[1], arguments[2]);
         break;
      case 4: startWithBoshParameters(arguments[0], arguments[1], arguments[2], arguments[3]);
         break;
      default:
         Log.warn('Wrong number of parameters.');
   }
}

function startUI() {
   UI.init();
}

function startWithCredentials(boshUrl: string, jid: string, password: string) {
   let connectionPromise = Client.createAccount.apply(this, arguments);

   return connectionPromise.then(function() {
      UI.init();
   });
}

function startWithBoshParameters(boshUrl: string, jid: string, sid: string, rid: string) {

}

export function enableDebugMode() {
   let storage = Client.getStorage();

   storage.setItem('debug', true);
}

export function disableDebugMode() {
   let storage = Client.getStorage();

   storage.setItem('debug', false);
}

export function deleteAllData() {
   if (!Client.isDebugMode()) {
      Log.warn('This action is only available in debug mode.');

      return 0;
   }

   let storage = Client.getStorage();
   let prefix = storage.getPrefix();
   let prefixRegex = new RegExp('^' + prefix);
   let backend = storage.getBackend();
   let keys = Object.keys(backend);
   let count = 0;

   for(let key of keys) {
      if (prefixRegex.test(key) && key !== prefix + 'debug') {
         backend.removeItem(key);
         count++;
      }
   }

   return count;
}
