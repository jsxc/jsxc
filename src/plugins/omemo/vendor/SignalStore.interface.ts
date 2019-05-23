
export interface IIdentityKeyPair { privKey?: ArrayBuffer, pubKey: ArrayBuffer }
export interface IPreKeyPair { pubKey, privKey }
export interface ISignedPreKeyPair { signature, pubKey, privKey }

interface ISignalStore {
   Direction: { SENDING: number, RECEIVING: number }

   getIdentityKeyPair(): Promise<IIdentityKeyPair>;

   getLocalRegistrationId(): Promise<number>;

   isTrustedIdentity(addressName: string, identityKey: ArrayBuffer, direction: number): Promise<boolean>;

   saveIdentity(address: string, identityKey: ArrayBuffer): Promise<boolean>;

   loadPreKey(keyId: number): Promise<undefined | IPreKeyPair>;

   removePreKey(keyId: number): Promise<void>;

   loadSignedPreKey(keyId: number): Promise<undefined | IPreKeyPair>;

   loadSession(address: string): Promise<string | undefined>;

   storeSession(identifier: string, session: string): Promise<void>;
}

export default ISignalStore;
