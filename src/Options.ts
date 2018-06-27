import Client from './Client'
import Log from './util/Log'
import * as defaultOptions from './OptionsDefault'

export default class Options {

   private static instance: Options;

   private constructor(private defaults) {

   }

   public static get(): Options {
      if (!Options.instance) {
         Options.instance = new Options(defaultOptions);
      }

      return Options.instance;
   }

   public get(key, account?) {
      let storage = account ? account.getStorage() : Client.getStorage();
      let local = storage.getItem('options') || {};

      if (typeof local[key] !== 'undefined') {
         return local[key];
      } else if (typeof this.defaults[key] !== 'undefined') {
         return this.defaults[key];
      }

      Log.debug(`I don't know any "${key}" option.`);

      return {};
   };

   public set(key, value, account?) {
      let storage = account ? account.getStorage() : Client.getStorage();

      storage.updateItem('options', key, value);
   };

   public overwriteDefaults(options) {
      let optionKeys = Object.keys(options);
      let defaultKeys = Object.keys(this.defaults);
      let unknownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) < 0);
      let knownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) > -1);

      if (unknownOptionKeys.length > 0) {
         Log.warn('I don\'t know the following options and therefore I will ignore them.', unknownOptionKeys);

         for (let unknownKey of unknownOptionKeys) {
            delete options[unknownKey];
         }
      }

      Object.assign(this.defaults, options);
   }

   public addDefaults(options) {
      let optionKeys = Object.keys(options);
      let defaultKeys = Object.keys(this.defaults);
      let unknownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) < 0);
      let knownOptionKeys = optionKeys.filter(e => defaultKeys.indexOf(e) > -1);

      if (knownOptionKeys.length > 0) {
         Log.debug('I already know the following options: ', knownOptionKeys);

         for (let knownKey of knownOptionKeys) {
            delete options[knownKey];
         }
      }

      Object.assign(this.defaults, options);
   }
};
