export default interface IStorage {

   getName(): string
   generateKey(...args: string[]): string
   getPrefix(): string
   getBackend()

   setItem(type: string, key: string, value: any): void;
   setItem(key: string, value: any): void

   getItem(type: string, key: string): any;
   getItem(key: string): any;

   removeItem(type, key): void;
   removeItem(key): void;

   updateItem(type, key, variable, value): void;
   updateItem(key, variable, value): void;

   increment(key: string): void

   removeElement(type, key, name): void;
   removeElement(key, name): void;

   getItemsWithKeyPrefix(keyPrefix: string)

   registerHook(eventName: string, func: (newValue: any, oldValue: any, key: string) => void)

   removeHook(eventName: string, func?: (newValue: any, oldValue: any, key: string) => void)

   removeAllHooks()

   destroy()
}
