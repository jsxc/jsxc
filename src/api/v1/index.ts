import Log from '../../util/Log'
import Client from '../../Client'
import Roster from '../../ui/Roster'
import { IPlugin } from '../../plugin/AbstractPlugin'
import FormWatcher, { SettingsCallback } from '../../FormWatcher'
import { disconnect } from './disconnect';
import Translation from '@util/Translation';
import loginBox from '@ui/dialogs/loginBox';
import Account from './Account';
import LinkHandlerXMPP from '@src/LinkHandlerXMPP'

export { disconnect };
export { start, startAndPause } from './start'
export { register } from './register'
export { enableDebugMode, disableDebugMode, deleteAllData } from './debug'
export { testBOSHServer } from './testBOSHServer'

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
         element.off('click', null, logout);

         $(this).get(0).click();
      });
   }

   element.off('click', null, logout).click(logout);
}

export function addHandlerToXMPPUri(container: JQuery = $('body')) {
   LinkHandlerXMPP.get().detect(container);
}

export function executeXMPPUri(uri: string) {
   return LinkHandlerXMPP.get().execute(uri);
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

export function getAccount(uid: string) {
   return new Account(uid);
}
