import Client from '@src/Client';
import Log from '@util/Log';

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

export function deleteObsoleteData() {
   let storage = Client.getStorage();
   let backend = storage.getBackend();
   let keys = Object.keys(backend);
   let count = 0;

   for (let key of keys) {
      if (/^jsxc:/.test(key)) {
         backend.removeItem(key);
         count++;
      }
   }

   return count;
}
