import Log from './util/Log'
import * as defaultOptions from './OptionsDefault'
import IStorage from './Storage.interface';
import Utils from '@util/Utils';
import Storage from './Storage';
import { IJID } from './JID.interface';
import Client from './Client';

const KEY = 'options';

interface IOptionData {
   [key: string]: any
}

export default class Options {

   private static defaults: IOptionData = defaultOptions;

   public static overwriteDefaults(options: IOptionData) {
      let optionKeys = Object.keys(options);
      let defaultKeys = Object.keys(Options.defaults);
      let unknownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) < 0);

      if (optionKeys.indexOf('storage') > -1) {
         // We have to make sure the storage is already set before we call e.g. Log.warn.
         Options.defaults.storage = options.storage;
      }

      if (unknownOptionKeys.length > 0) {
         Log.warn('I don\'t know the following options and therefore I will ignore them.', unknownOptionKeys);

         for (let unknownKey of unknownOptionKeys) {
            delete options[unknownKey];
         }
      }

      Object.assign(Options.defaults, options);
   }

   public static addDefaults(options: IOptionData) {
      let optionKeys = Object.keys(options);
      let defaultKeys = Object.keys(Options.defaults);
      let knownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) > -1);

      if (knownOptionKeys.length > 0) {
         Log.debug('I already know the following options: ', knownOptionKeys);

         for (let knownKey of knownOptionKeys) {
            delete options[knownKey];
         }
      }

      Object.assign(Options.defaults, options);
   }

   public static async load(username: string, password: string, jid?: IJID) {
      if (typeof Options.defaults.loadOptions !== 'function') {
         return;
      }

      let optionData;

      try {
         optionData = await Options.defaults.loadOptions(username, password);
      } catch (err) {
         Log.warn('Error while loading options', err);

         return;
      }

      for (let id in optionData) {
         if (id !== 'client' && id !== 'current' && (jid && id !== jid.bare) && !Client.getAccountManager().getAccount(id)) {
            Log.info(`Skip option block with id "${id}"`);

            continue;
         }

         if (id === 'current') {
            if (!jid) {
               Log.info(`Skip option block with id "current", because no jid is provided`);

               continue;
            }

            id = jid.bare;
         }

         let storage = new Storage(id);
         let options = new Options(storage);

         for (let key in optionData[id]) {
            Log.debug(`Set option "${key}"`, optionData[id][key]);

            options.set(key, optionData[id][key], true);
         }

         storage.destroy();
      }
   }

   public static getDefault(key: string) {
      return Options.defaults[key];
   }

   constructor(private storage: IStorage) {

   }

   public getId(): string {
      return this.storage.getName() || 'client';
   }

   public get(keyChain: string): any {
      function get(keys: string[], primary: any = {}, secondary: any = {}) {
         let key = keys.shift();

         if (keys.length) {
            return get(keys, primary[key], secondary[key]);
         } else if (typeof primary[key] !== 'undefined') {
            return Utils.isObject(primary[key]) && Utils.isObject(secondary[key]) ? { ...secondary[key], ...primary[key] } : primary[key];
         } else if (typeof secondary[key] !== 'undefined') {
            return secondary[key];
         }

         Log.debug(`I don't know any "${keyChain}" option.`);

         return undefined;
      }

      return get(keyChain.split('.'), this.storage.getItem(KEY), Options.defaults);
   };

   public set(keyChain: string, value: any, preventOnChange: boolean = false) {
      let subKeys = keyChain.split('.');
      let options = this.storage.getItem(KEY) || {};

      function set(keys: string[], data: any = {}) {
         let key = keys.shift();

         if (keys.length) {
            data[key] = set(keys, data[key]);
         } else {
            if (Utils.isObject(data[key]) && Utils.isObject(value)) {
               Utils.mergeDeep(data[key], value);
            } else {
               data[key] = value;
            }
         }

         return data;
      }

      this.storage.setItem(KEY, set(subKeys, options));

      if (typeof Options.defaults.onOptionChange === 'function' && !preventOnChange) {
         Options.defaults.onOptionChange(this.getId(), keyChain, value, () => this.export());
      }
   };

   public registerHook(key: string, func: (newValue: any, oldValue?: any) => void) {
      this.storage.registerHook(KEY, (newData, oldData) => {
         let n = newData[key];
         let o = oldData && typeof oldData[key] !== 'undefined' ? oldData[key] : Options.defaults[key];

         if (n !== o) {
            func(n, o);
         }
      });
   }

   public export(): IOptionData {
      return this.storage.getItem(KEY) || {};
   }
};
