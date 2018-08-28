import Exportable from "./Exportable";

export interface PreKeyObject {
   keyId: number
   keyPair: {
      publicKey: ArrayBuffer,
      privateKey?: ArrayBuffer,
   }
}

export default class PreKey implements Exportable {
   constructor(protected data: PreKeyObject) {

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

   public export(): PreKeyObject {
      return this.data;
   }
}
