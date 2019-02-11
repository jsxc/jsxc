import PreKey, { IPreKeyObject } from './PreKey';

interface ISignedPreKeyObject extends IPreKeyObject {
   signature: ArrayBuffer
}

export default class SignedPreKey extends PreKey {
   constructor(data: ISignedPreKeyObject) {
      super(data);
   }

   public getSignature(): ArrayBuffer {
      return (<ISignedPreKeyObject> this.data).signature;
   }
}
