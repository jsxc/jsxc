import Log from './util/Log';
import * as UI from './ui/web'
import Client from './Client'
import Roster from './ui/Roster'
import 'magnific-popup'
import * as StropheLib from 'strophe.js'
import OTRPlugin from './plugins/otr/Plugin'
import ReceiptPlugin from './plugins/receipts'
import NotificationPlugin from './plugins/Notification'
import MeCommandPlugin from './plugins/MeCommand'
import MessageArchiveManagementPlugin from './plugins/mam/Plugin'
import ChatStatePlugin from './plugins/chatState/ChatStatePlugin'
import HttpUploadPlugin from './plugins/httpUpload/HttpUploadPlugin'
import AvatarVCardPlugin from './plugins/AvatarVCardPlugin'

// @REVIEW
$.extend(window, StropheLib)

Client.addPlugin(OTRPlugin);
Client.addPlugin(ReceiptPlugin);
Client.addPlugin(NotificationPlugin);
Client.addPlugin(MeCommandPlugin);
Client.addPlugin(MessageArchiveManagementPlugin);
Client.addPlugin(ChatStatePlugin);
Client.addPlugin(HttpUploadPlugin);
Client.addPlugin(AvatarVCardPlugin);

Client.init();

export async function startAndPause(boshUrl: string, jid: string, password: string) {
   Roster.hide(); //@TODO hide only if this is the first account
   let account = await Client.createAccount(boshUrl, jid, password);

   return account.connect(true).then(() => undefined);
}

export function start(boshUrl: string, jid: string, sid: string, rid: string);
export function start(boshUrl: string, jid: string, password: string);
export function start();
export function start() {
   switch (arguments.length) {
      case 0: startUI();
         break;
      case 3: startWithCredentials(arguments[0], arguments[1], arguments[2]);
         break;
      case 4: startWithBoshParameters(arguments[0], arguments[1], arguments[2], arguments[3]);
         break;
      default:
         throw 'Wrong number of parameters.';
   }
}

function startUI() {
   UI.init();
}

async function startWithCredentials(boshUrl: string, jid: string, password: string) {
   Roster.get().startProcessing('Connecting...');

   let account = await Client.createAccount(boshUrl, jid, password);

   account.connect().then(function() {
      startUI();
   }).catch(() => {
      //@TODO handle error
   }).then(() => {
      Roster.get().endProcessing();
   });
}

function startWithBoshParameters(boshUrl: string, jid: string, sid: string, rid: string) {
   //@TODO start with bosh parameters
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

   for (let key of keys) {
      if (prefixRegex.test(key) && key !== prefix + 'debug') {
         backend.removeItem(key);
         count++;
      }
   }

   return count;
}
