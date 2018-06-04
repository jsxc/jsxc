
export interface KeyPairObject {
   privKey?: ArrayBuffer
   pubKey: ArrayBuffer
}
export interface PreKeyObject {
   keyId: number
   keyPair: KeyPairObject
}
export interface SignedPreKeyObject {
   keyId: number
   keyPair: KeyPairObject
   signature: string | ArrayBuffer //@REVIEW
}
export interface BundleObject {
   identityKey: KeyPairObject,
   signedPreKey: SignedPreKeyObject,
   preKeys: PreKeyObject[],
}

export interface SignalBundleObject {
   identityKey: ArrayBuffer,
   registrationId: number,
   preKey: {
      keyId: number
      publicKey: ArrayBuffer
   },
   signedPreKey: {
      keyId: number
      publicKey: ArrayBuffer
      signature: string | ArrayBuffer
   }
}
