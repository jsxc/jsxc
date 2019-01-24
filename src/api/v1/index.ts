import Client from '../../Client'
import Roster from '../../ui/Roster'
import { IPlugin } from '../../plugin/AbstractPlugin'
import FormWatcher, { SettingsCallback } from '../../FormWatcher'

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

export function watchForm(formElement: JQuery, usernameElement: JQuery, passwordElement: JQuery, settingsCallback: SettingsCallback) {
   new FormWatcher(formElement, usernameElement, passwordElement, settingsCallback);
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
