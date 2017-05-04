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
