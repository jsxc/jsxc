export default interface IStorage {
   getName(): string;
   generateKey(...args: string[]): string;
   getPrefix(): string;
   getBackend();

   setItem<Data = any>(type: string, key: string, value: Data): void;
   setItem<Data = any>(key: string, value: Data): void;

   getItem<Data = any>(type: string, key: string): Data;
   getItem<Data = any>(key: string): Data;

   removeItem(type, key): void;
   removeItem(key): void;

   updateItem(type, key, variable, value): void;
   updateItem(key, variable, value): void;

   increment(key: string): void;

   removeElement(type, key, name): void;
   removeElement(key, name): void;

   getItemsWithKeyPrefix(keyPrefix: string);

   registerHook(eventName: string, func: (newValue: any, oldValue: any, key: string) => void);

   removeHook(eventName: string, func?: (newValue: any, oldValue: any, key: string) => void);

   removeAllHooks();

   destroy();
}
