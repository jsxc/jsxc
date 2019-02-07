
export interface IdentityKeyPair { privKey?: ArrayBuffer, pubKey: ArrayBuffer }
export interface PreKeyPair { pubKey, privKey }
export interface SignedPreKeyPair { signature, pubKey, privKey }

interface SignalStore {
   Direction: { SENDING: number, RECEIVING: number }

   getIdentityKeyPair(): Promise<IdentityKeyPair>;

   getLocalRegistrationId(): Promise<number>;

   isTrustedIdentity(addressName: string, identityKey: ArrayBuffer, direction: number): Promise<boolean>;

   saveIdentity(address: string, identityKey: ArrayBuffer): Promise<boolean>;

   loadPreKey(keyId: number): Promise<undefined | PreKeyPair>;

   removePreKey(keyId: number): Promise<void>;

   loadSignedPreKey(keyId: number): Promise<undefined | PreKeyPair>;

   loadSession(address: string): Promise<string | undefined>;

   storeSession(identifier: string, session: string): Promise<void>;
}

export default SignalStore;
