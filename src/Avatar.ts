import { IAvatar } from './Avatar.interface'
import Client from './Client'
import PersistentMap from './util/PersistentMap'
import calculateHash from './util/SHA1Hash'

export default class implements IAvatar {
   private properties: PersistentMap;

   constructor(private sha1Hash: string, type?: string, data?: string) {
      let storage = Client.getStorage();
      this.properties = new PersistentMap(storage, sha1Hash);

      if (!this.properties.get('data')) {
         if (data && type) {


            let expectedHash = calculateHash(data);

            if (expectedHash !== sha1Hash) {
               throw new Error('SHA-1 hash doesnt match');
            }

            this.properties.set('data', data);
            this.properties.set('type', type);
         } else {
            throw new Error('Avatar not found');
         }
      }
   }

   public getData(): string {
      return this.properties.get('data');
   }

   public getType(): string {
      return this.properties.get('type');
   }

   public getHash(): string {
      return this.sha1Hash;
   }
}
