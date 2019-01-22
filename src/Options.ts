import Log from './util/Log'
import * as defaultOptions from './OptionsDefault'
import Storage from './Storage';

const KEY = 'options';

interface OptionData {
   [key: string]: any
}

export default class Options {

   private static defaults: OptionData = defaultOptions;

   public static overwriteDefaults(options: OptionData) {
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

   public static addDefaults(options: OptionData) {
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

   public static getDefault(key: string) {
      return Options.defaults[key];
   }

   constructor(private storage: Storage) {

   }

   public getId(): string {
      return this.storage.getName() || 'client';
   }

   public get(key: string): any {
      let local = this.storage.getItem(KEY) || {};

      if (typeof local[key] !== 'undefined') {
         return local[key];
      } else if (typeof Options.defaults[key] !== 'undefined') {
         return Options.defaults[key];
      }

      Log.debug(`I don't know any "${key}" option.`);

      return undefined;
   };

   public set(key: string, value: any) {
      this.storage.updateItem(KEY, key, value);

      if (typeof Options.defaults.onOptionChange === 'function') {
         Options.defaults.onOptionChange(this.getId(), key, value, () => this.export());
      }
   };

   public registerHook(key: string, func: (newValue: any, oldValue?: any) => void) {
      this.storage.registerHook(KEY, (newData, oldData) => {
         let n = newData[key];
         let o = typeof oldData[key] !== 'undefined' ? oldData[key] : Options.defaults[key];

         if (n !== o) {
            func(n, o);
         }
      });
   }

   public export(): OptionData {
      return this.storage.getItem(KEY) || {};
   }
};
