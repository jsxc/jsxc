import ArrayBufferUtils from '../util/ArrayBuffer'
import Exportable from './Exportable';

type IdentityKeyObject = { publicKey: ArrayBuffer, privateKey?: ArrayBuffer }

export default class IdentityKey implements Exportable {
   constructor(private data: IdentityKeyObject) {

   }

   public getFingerprint(): string {
      return this.data.publicKey ? ArrayBufferUtils.toPrettyHex(this.getPublicKeyWithoutVersionByte()) : '';
   }

   public getPublic(): ArrayBuffer {
      return this.data.publicKey;
   }

   public getPrivate(): ArrayBuffer {
      return this.data.privateKey;
   }

   private getPublicKeyWithoutVersionByte(): ArrayBuffer {
      return this.data.publicKey.slice(1);
   }

   public export(): IdentityKeyObject {
      return this.data;
   }
}
