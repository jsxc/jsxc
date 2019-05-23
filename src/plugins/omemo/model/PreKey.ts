import IExportable from './Exportable';

export interface IPreKeyObject {
   keyId: number
   keyPair: {
      publicKey: ArrayBuffer,
      privateKey?: ArrayBuffer,
   }
}

export default class PreKey implements IExportable {
   constructor(protected data: IPreKeyObject) {

   }

   public getId(): number {
      return this.data.keyId;
   }

   public getPublic(): ArrayBuffer {
      return this.data.keyPair.publicKey;
   }

   public getPrivate(): ArrayBuffer | undefined {
      return this.data.keyPair.privateKey;
   }

   public export(): IPreKeyObject {
      return this.data;
   }
}
