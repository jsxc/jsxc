import ArrayBufferUtils from '../util/ArrayBuffer'
import IExportable from './Exportable';

interface IIdentityKeyObject { publicKey: ArrayBuffer, privateKey?: ArrayBuffer }

export default class IdentityKey implements IExportable {
   constructor(private data: IIdentityKeyObject) {

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

   public export(): IIdentityKeyObject {
      return this.data;
   }
}
