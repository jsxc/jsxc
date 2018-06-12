let scriptElements = document.querySelectorAll('script[src$="jsxc.bundle.js"]');
if (scriptElements.length) {
   let src = (<HTMLScriptElement>scriptElements[0]).src;
   __webpack_public_path__ = src.substr(0, src.lastIndexOf('/') + 1);
}

import Log from './util/Log'
import * as UI from './ui/web'
import Client from './Client'
import Roster from './ui/Roster'
import * as StropheLib from 'strophe.js'
import InvalidParameterError from './errors/InvalidParameterError'
import { IPlugin } from './plugin/AbstractPlugin'
import OTRPlugin from './plugins/otr/Plugin'
import ReceiptPlugin from './plugins/receipts'
import NotificationPlugin from './plugins/Notification'
import MeCommandPlugin from './plugins/MeCommand'
import MessageArchiveManagementPlugin from './plugins/mam/Plugin'
import ChatStatePlugin from './plugins/chatState/ChatStatePlugin'
import HttpUploadPlugin from './plugins/httpUpload/HttpUploadPlugin'
import AvatarVCardPlugin from './plugins/AvatarVCardPlugin'
import CarbonsPlugin from './plugins/Carbons'
import OMEMOPlugin from './plugins/omemo/Plugin'
import BaseError from './errors/BaseError'
import FormWatcher, { SettingsCallback } from './FormWatcher'

// @REVIEW
$.extend(window, StropheLib)

Client.addPlugin(OTRPlugin);
Client.addPlugin(OMEMOPlugin);
Client.addPlugin(ReceiptPlugin);
Client.addPlugin(NotificationPlugin);
Client.addPlugin(MeCommandPlugin);
Client.addPlugin(MessageArchiveManagementPlugin);
Client.addPlugin(ChatStatePlugin);
Client.addPlugin(HttpUploadPlugin);
Client.addPlugin(AvatarVCardPlugin);
Client.addPlugin(CarbonsPlugin);

export function init(options?): number {
   return Client.init(options);
}

export function addPlugin(Plugin: IPlugin) {
   Client.addPlugin(Plugin);
}

export function addMenuEntry(options: { id: string, handler: (ev) => void, label: string | JQuery<HTMLElement>, icon?: string, offlineAvailable?: boolean }) {
   Roster.get().addMenuEntry(options);
}

export async function startAndPause(boshUrl: string, jid: string, password: string) {
   Roster.hide(); //@TODO hide only if this is the first account
   let account = await Client.createAccount(boshUrl, jid, password);

   return account.connect(true).then(() => undefined);
}

export function start(boshUrl: string, jid: string, sid: string, rid: string);
export function start(boshUrl: string, jid: string, password: string);
export function start();
export function start() {
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

export function watchForm(formElement: JQuery, usernameElement: JQuery, passwordElement: JQuery, settingsCallback: SettingsCallback) {
   new FormWatcher(formElement, usernameElement, passwordElement, settingsCallback);
}

function startUI() {
   UI.init();
}

async function startWithCredentials(boshUrl: string, jid: string, password: string) {
   let account = await Client.createAccount(boshUrl, jid, password);

   return account.connect().then(function() {
      startUI();
   }).catch((err) => {
      Client.removeAccount(account);

      if (err instanceof BaseError) {
         Log.warn('Instance of BaseErrors', err.toString());

         throw err;
      }

      console.log('Unknown error:', err);

      throw 'Unknown error';
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
