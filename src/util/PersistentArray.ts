import Storage from '../Storage'

export default class PersistentArray {

   private array: any[];

   private key: string;

   constructor(private storage: Storage, ...identifier: string[]) {
      this.key = storage.generateKey.apply(storage, identifier);

      this.array = this.storage.getItem(this.key) || [];

      this.storage.registerHook(this.key, (newValue) => {
         this.array = newValue;
      });
   }

   public push(element) {
      this.array.push(element);

      this.save();
   }

   public pop(): any {
      let element = this.array.pop();

      this.save();

      return element;
   }

   public indexOf(element): number {
      return this.array.indexOf(element);
   }

   private save() {
      this.storage.setItem(this.key, this.array);
   }
}
