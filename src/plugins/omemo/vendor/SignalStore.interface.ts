
export type IdentityKeyPair = { privKey?: ArrayBuffer, pubKey: ArrayBuffer };
export type IdentityKey = ArrayBuffer;
export type Identifier = string;
export type RegistrationId = number;
export type PreKeyPair = { pubKey, privKey };
export type KeyId = number;
export type Session = any;

interface SignalStore {
   getIdentityKeyPair(): Promise<IdentityKeyPair>;

   getLocalRegistrationId(): Promise<RegistrationId>;

   put(key: string, value: any): void;

   get(key: string, defaultValue?: any): any;

   remove(key: string): void;

   isTrustedIdentity(identifier: Identifier, identityKey: IdentityKey): Promise<boolean>;

   loadIdentityKey(identifier: Identifier): Promise<IdentityKey>;

   saveIdentity(identifier: Identifier, identityKey: IdentityKey): Promise<boolean>;

   loadPreKey(keyId: KeyId): Promise<undefined | PreKeyPair>;

   storePreKey(keyId: KeyId, keyPair: PreKeyPair): Promise<void>;

   removePreKey(keyId: KeyId): Promise<void>;

   loadSignedPreKey(keyId: KeyId): Promise<undefined | PreKeyPair>;

   storeSignedPreKey(keyId: KeyId, keyPair: PreKeyPair): Promise<void>;

   removeSignedPreKey(keyId: KeyId): Promise<void>;

   loadSession(identifier: Identifier): Promise<Session | undefined>;

   storeSession(identifier: Identifier, session: Session): Promise<void>;

   removeSession(identifier: Identifier): Promise<void>;

   removeAllSessions(identifier: Identifier): Promise<void>;
}

export default SignalStore;
