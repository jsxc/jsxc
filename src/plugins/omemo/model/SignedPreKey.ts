import PreKey, { PreKeyObject } from './PreKey';

interface SignedPreKeyObject extends PreKeyObject {
   signature: ArrayBuffer
}

export default class SignedPreKey extends PreKey {
   constructor(data: SignedPreKeyObject) {
      super(data);
   }

   public getSignature(): ArrayBuffer {
      return (<SignedPreKeyObject> this.data).signature;
   }
}
