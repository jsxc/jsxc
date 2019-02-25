import Log from '../../util/Log'
import Client from '../../Client'
import Roster from '../../ui/Roster'
import { IPlugin } from '../../plugin/AbstractPlugin'
import FormWatcher, { SettingsCallback } from '../../FormWatcher'
import { disconnect } from './disconnect';
import Translation from '@util/Translation';
import loginBox from '@ui/dialogs/loginBox';

export { disconnect };
export { start, startAndPause } from './start'
export { register } from './register'
export { testBOSHServer } from './testBOSHServer'

export function init(options?): number {
   return Client.init(options);
}

export function addPlugin(Plugin: IPlugin) {
   Client.addPlugin(Plugin);
}

export function addMenuEntry(options: { id: string, handler: (ev) => void, label: string | JQuery<HTMLElement>, icon?: string, offlineAvailable?: boolean }) {
   Roster.get().addMenuEntry(options);
}

export function toggleRoster() {
   Roster.get().toggle();
}

export function watchForm(formElement: JQuery, usernameElement: JQuery, passwordElement: JQuery, settingsCallback?: SettingsCallback) {
   new FormWatcher(formElement, usernameElement, passwordElement, settingsCallback);
}

export function watchLogoutClick(element: JQuery) {
   if (element.length === 0) {
      throw new Error('I found no logout element.');
   }

   Log.debug('Logout watcher armed');

   function logout(ev) {
      ev.stopPropagation();
      ev.preventDefault();

      disconnect().then(() => {
         $(this).off('click', null, logout);

         $(this).get(0).click();
      });
   }

   element.off('click', null, logout).click(logout);
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

export function exportAllOptions() {
   let accounts = Client.getAccountManager().getAccounts();

   return {
      ...accounts.reduce((previous, account) => {
         let option = account.getOptions();

         previous[option.getId()] = option.export();

         return previous;
      }, {}),
      [Client.getOptions().getId()]: Client.getOptions().export()
   };
}

export function translate(str: string, param) {
   return Translation.t(str, param);
}

export function showLoginBox(username?: string) {
   loginBox(username);
}
