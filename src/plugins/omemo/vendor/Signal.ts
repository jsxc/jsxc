
export interface ISignalBundleObject {
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

interface ISignalPreKey {
   keyId: number

   keyPair: ISignalKeyPair
}

interface ISignalSignedPreKey extends ISignalPreKey {
   signature: ArrayBuffer
}

interface ISignalKeyPair {
   privKey?: ArrayBuffer

   pubKey: ArrayBuffer
}

interface ISignalKeyHelper {
   generatePreKey: (keyId: number) => Promise<ISignalPreKey>

   generateSignedPreKey: (identityKeyPair: ISignalKeyPair, signedKeyId: number) => Promise<ISignalSignedPreKey>

   generateIdentityKeyPair: () => Promise<ISignalKeyPair>

   generateRegistrationId: () => number
}

let libsignal = (<any> window).libsignal || {};

export let SignalAddress = libsignal.SignalProtocolAddress;
export let SignalKeyHelper: ISignalKeyHelper = libsignal.KeyHelper;
export let SignalSessionBuilder = libsignal.SessionBuilder;
export let SignalSessionCipher = libsignal.SessionCipher;
export let SignalFingerprintGenerator = libsignal.FingerprintGenerator;
