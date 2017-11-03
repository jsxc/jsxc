import Log from './util/Log'

const PREFIX = 'jsxc2';

const SEP = ':';

const IGNORE_KEY = ['rid'];

const BACKEND = localStorage;

export default class Storage {
   static storageNotConform: boolean = false;
   static tested: boolean = false;

   private hooks: any = {};

   static toSNC: number;

   constructor(private name: string = null) {
      if (!Storage.tested) {
         Storage.tested = true;

         this.testStorage();
      }

      window.addEventListener('storage', this.onStorageEvent, false);
   }

   public getName(): string {
      return this.name;
   }

   public generateKey(...args: string[]): string {
      let key = '';

      args.forEach(function(arg) {
         if (key !== '') {
            key += SEP;
         }

         key += arg;
      })

      return key;
   }

   private testStorage() {
      let randomNumber = Math.round(Math.random() * 1000000000) + '';
      let key = this.getPrefix() + randomNumber;
      let timeout;

      let listenerFunction = function(ev) {
         if (ev.newValue === randomNumber) {
            clearTimeout(timeout);
            cleanup();
            Storage.storageNotConform = true;
         }
      };

      let cleanup = function() {
         window.removeEventListener('storage', listenerFunction, false);
         BACKEND.removeItem(key)
      }

      window.addEventListener('storage', listenerFunction, false);

      timeout = setTimeout(function() {
         cleanup();
      }, 20);

      BACKEND.setItem(key, randomNumber);
   }

   public getPrefix(): string {
      let prefix = PREFIX + SEP;

      if (this.name) {
         prefix += this.name + SEP;
      }

      return prefix;
   }

   public getBackend() {
      return BACKEND;
   }

   public setItem(type: string, key: string, value: any): void;
   public setItem(key: string, value: any): void
   public setItem(): void {
      let key, value;

      if (arguments.length === 2) {
         key = arguments[0];
         value = arguments[1];
      } else if (arguments.length === 3) {
         key = arguments[0] + SEP + arguments[1];
         value = arguments[2];
      }

      //@REVIEW why do we just stringify objects?
      if (typeof (value) === 'object') {
         // exclude jquery objects, because otherwise safari will fail
         try {
            value = JSON.stringify(value, function(key, val) {
               if (!(val instanceof jQuery)) {
                  return val;
               }
            });
         } catch (err) {
            console.warn('Could not stringify value', err);
         }
      }

      let oldValue = BACKEND.getItem(this.getPrefix() + key);

      BACKEND.setItem(this.getPrefix() + key, value);

      if (!Storage.storageNotConform && oldValue !== value) {
         this.onStorageEvent({
            key: this.getPrefix() + key,
            oldValue: oldValue,
            newValue: value
         });
      }
   }

   public getItem(type: string, key: string): any;
   public getItem(key: string): any;
   public getItem(): any {
      let key;

      if (arguments.length === 1) {
         key = arguments[0];
      } else if (arguments.length === 2) {
         key = arguments[0] + SEP + arguments[1];
      }

      key = this.getPrefix() + key;

      var value = BACKEND.getItem(key);

      return this.parseValue(value);
   }

   public removeItem(type, key): void;
   public removeItem(key): void;
   public removeItem(): void {
      let key;

      if (arguments.length === 1) {
         key = arguments[0];
      } else if (arguments.length === 2) {
         key = arguments[0] + SEP + arguments[1];
      }

      BACKEND.removeItem(this.getPrefix() + key);
   }

   public updateItem(type, key, variable, value): void;
   public updateItem(key, variable, value): void;
   public updateItem(): void {
      let key, variable, value;

      if (arguments.length === 4 || (arguments.length === 3 && typeof variable === 'object')) {
         key = arguments[0] + SEP + arguments[1];
         variable = arguments[2];
         value = arguments[3];
      } else {
         key = arguments[0];
         variable = arguments[1];
         value = arguments[2];
      }

      var data = this.getItem(key) || {};

      if (typeof (variable) === 'object') {

         $.each(variable, function(key, val) {
            if (typeof (data[key]) === 'undefined') {
               Log.debug('Variable ' + key + ' doesn\'t exist in ' + variable + '. It was created.');
            }

            data[key] = val;
         });
      } else {
         if (typeof data[variable] === 'undefined') {
            Log.debug('Variable ' + variable + ' doesn\'t exist. It was created.');
         }

         data[variable] = value;
      }

      this.setItem(key, data);
   }

   public increment(key: string): void {
      let value = Number(this.getItem(key));

      this.setItem(key, value + 1);
   }

   public removeElement(type, key, name): void;
   public removeElement(key, name): void;
   public removeElement(): void {
      let key, name;

      if (arguments.length === 2) {
         key = arguments[0];
         name = arguments[1];
      } else if (arguments.length === 3) {
         key = arguments[0] + SEP + arguments[1];
         name = arguments[2];
      }

      var item = this.getItem(key);

      if ($.isArray(item)) {
         item = $.grep(item, function(e) {
            return e !== name;
         });
      } else if (typeof (item) === 'object' && item !== null) {
         delete item[name];
      }

      this.setItem(key, item);
   }

   public registerHook(eventName: string, func: (newValue: any, oldValue: any, key: string) => void) {
      if (!this.hooks[eventName]) {
         this.hooks[eventName] = [];
      }

      this.hooks[eventName].push(func);
   }

   public removeHook(eventName: string, func?: (newValue: any, oldValue: any, key: string) => void) {
      let eventNameList = this.hooks[eventName] || [];

      if (typeof func === 'undefined') {
         eventNameList = [];
      } else if (eventNameList.indexOf(func) > -1) {
         eventNameList = $.grep(eventNameList, function(i) {
            return func !== i;
         });
      }

      this.hooks[eventName] = eventNameList;
   }

   private onStorageEvent = (ev: any) => {
      let hooks = this.hooks;
      let key = ev.key.replace(new RegExp('^' + this.getPrefix()), '');
      let oldValue = this.parseValue(ev.oldValue);
      let newValue = this.parseValue(ev.newValue);

      if (IGNORE_KEY.indexOf(key) > -1) {
         return;
      }

      let eventNames = Object.keys(hooks);
      eventNames.forEach(function(eventName) {
         if (key.match(new RegExp('^' + eventName + '(:.+)?$'))) {
            let eventNameHooks = hooks[eventName] || [];
            eventNameHooks.forEach(function(hook) {
               hook(newValue, oldValue, key);
            });
         }
      });
   }

   private parseValue(value: string) {
      try {
         return JSON.parse(value);
      } catch (e) {
         return value;
      }
   }
}
