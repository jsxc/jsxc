import Identifiable from './IdentifiableInterface'
import Storage from './Storage'
import Log from './util/Log'

export default class SortedPersistentMap {

   private map = {};

   private list;

   private key: string;

   private initialized = false;

   private pushHook;

   private removeHook;

   constructor(private storage: Storage, ...identifier: string[]) {
      this.key = storage.generateKey.apply(storage, identifier);

      this.list = this.storage.getItem(this.key) || [];

      this.storage.registerHook(this.key, this.onStorage);
   }

   public init() {
      if (this.initialized) {
         return;
      }

      if (typeof this.pushHook !== 'function') {
         Log.error('push hook required');

         return;
      }

      this.list.forEach(id => {
         try {
            this.map[id] = this.pushHook(id);
         } catch(err) {
            Log.error('Push hook threw the following error', err);
         }
      });

      this.initialized = true;
   }

   public get(id: string) {
      return this.map[id];
   }

   public push(element: Identifiable) {
      let id = element.getId();

      if (typeof this.map[id] !== 'undefined') {
         //@TODO error reporting
         return;
      }

      this.map[id] = element;
      this.list.push(id);

      this.save();
   }

   public empty(callback) {
      this.list.forEach(id => {
         callback(id, this.map[id]);
      });

      this.map = {};
      this.list = [];

      this.save();
   }

   public remove(id: Identifiable);
   public remove(id: string);
   public remove() {
      let id;

      if (typeof arguments[0] === 'string') {
         id = arguments[0];
      } else if (typeof arguments[0].getId === 'function') {
         id = arguments[0].getId();
      } else {
         //@TODO error
         return;
      }

      this.list = $.grep(this.list, function(i) {
         return id !== i;
      });

      delete this.map[id];

      this.save();
   }

   public registerHook(func: (newValue: any, oldValue: any, key: string) => void) {
      this.storage.registerHook(this.key, func);
   }

   public setPushHook(func: (newValue: any, oldValue: any, key: string) => void) {
      this.pushHook = func;
   }

   public setRemoveHook(func: (newValue: any, oldValue: any, key: string) => void) {
      this.removeHook = func;
   }

   private onStorage = (newValue: any, oldValue: any, key: string) => {
      oldValue = oldValue || [];

      if (newValue.length === oldValue.length) {
         return;
      }

      let pushDiff: string[] = newValue.filter(id => oldValue.indexOf(id) < 0);

      for (let value of pushDiff) {
         // call push hook
         if (typeof this.pushHook === 'function') {
            let result = this.pushHook(value);

            if (typeof this.get(value) === 'undefined') {
               this.map[value] = result;
            }
         }
      }

      let removeDiff: string[] = oldValue.filter(id => newValue.indexOf(id) < 0);

      for (let value of removeDiff) {
         // call remove hook
         if (typeof this.removeHook === 'function') {
            this.removeHook(value, this.map[value]);
         }

         delete this.map[value];
      }

      this.list = newValue;

   }

   private save() {
      this.initialized = true;

      this.storage.setItem(this.key, this.list);
   }
}
