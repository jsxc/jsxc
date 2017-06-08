import Identifiable from './IdentifiableInterface'
import Storage from './Storage'

export default class PersistentMap {

   private map = {};

   private key:string;

   private initialized = false;

   constructor(private storage:Storage, ...identifier:string[]) {
      this.key = storage.generateKey.apply(storage, identifier);

      this.map = this.storage.getItem(this.key) || {};
   }

   public get(id:string) {
      return this.map[id];
   }

   public set(id:string, value:any);
   public set(value:any);
   public set() {
      if (typeof arguments[0] === 'string'){
         let id = arguments[0];
         let value = arguments[1];

         this.map[id] = value;
      } else if(typeof arguments[0] === 'object' && arguments[0] !== null) {
         $.extend(this.map, arguments[0]);
      }

      this.save();
   }

   public empty() {
      this.map = {};

      this.save();
   }

   public remove(id:Identifiable);
   public remove(id:string);
   public remove() {
      let id;

      if (typeof arguments[0] === 'string') {
         id = arguments[0];
      } else if(typeof arguments[0].getId === 'function') {
         id = arguments[0].getId();
      } else {
         //@TODO error
         return;
      }

      delete this.map[id];

      this.save();
   }

   public registerHook(id:string, func: (newValue: any, oldValue: any, key: string) => void);
   public registerHook(func: (newValue: any, oldValue: any, key: string) => void);
   public registerHook() {
      if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
         let id = arguments[0];
         let func = arguments[1];

         this.storage.registerHook(this.key, function(newData, oldData) {
            if (!oldData || newData[id] !== oldData[id]) {
               func(newData[id], oldData[id]);
            }
         });
      } else {
         let func = arguments[0];

         this.storage.registerHook(this.key, func);
      }
   }

   private save() {
      this.initialized = true;

      this.storage.setItem(this.key, this.map);
   }
}
