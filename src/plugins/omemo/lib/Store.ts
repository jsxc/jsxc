import { SignalProtocolAddress } from '../vendor/Signal'
import SignalStore, { IdentityKeyPair, IdentityKey, Identifier, RegistrationId, PreKeyPair, KeyId, Session } from '../vendor/SignalStore.interface'
import { SignalBundleObject } from './ObjectTypes'
import Bundle from './Bundle'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { NS_BASE, NS_BUNDLES } from '../util/Const'
import Device from './Device'

const PREFIX = 'store';
const PREFIX_SESSION = 'session:';
const PREFIX_IDENTITYKEY = 'identityKey:';
const PREFIX_PREKEY = '25519KeypreKey:';
const PREFIX_SIGNEDPREKEY = '25519KeysignedKey:';
const PREFIX_TRUST = 'trust:';

//@TODO separate signal store and own store. Wrap keys and stuff into objects.

//@TODO rename
class IdentityKeyClass {
   constructor(private pubKey: ArrayBuffer, private privKey?: ArrayBuffer) {

   }

   public getFingerprint(): string {
      // remove version byte
      return this.pubKey ? ArrayBufferUtils.toPrettyHex(this.pubKey.slice(1)) : '';
   }

   public getPublic(): ArrayBuffer {
      return this.pubKey;
   }
}

export default class Store implements SignalStore {
   public Direction = {
      SENDING: 1,
      RECEIVING: 2
   };

   constructor(private storage, private pepService) { //@TODO add ts type

   }

   public getDeviceList(identifier) {
      return this.get('deviceList:' + identifier, []);
   }

   public setDeviceList(identifier, deviceList: number[]) {
      this.put('deviceList:' + identifier, deviceList);
   }

   public isReady(): boolean {
      return this.get('deviceId') && this.get('deviceName') && this.get('identityKey') && this.get('registrationId');
   }

   public isPublished(): boolean {
      return this.get('published') === 'true' || this.get('published') === true;
   }

   public getDeviceId(): number {
      return parseInt(this.get('deviceId'));
   }

   public getDeviceName(): string {
      return this.get('deviceName');
   }

   public getDeviceAddress() {
      return new SignalProtocolAddress(this.getDeviceName(), this.getDeviceId());
   }

   public getLocalIdentityKey(): IdentityKey {
      let identityKey = this.get('identityKey');

      return identityKey ? identityKey.pubKey : undefined;
   }

   public getTrust(identifier: Identifier) {
      if (identifier === this.getDeviceAddress().toString()) {
         return Device.Trust.confirmed;
      }

      let trustMatrix = this.getTrustMatrix(identifier);
      let fingerprint = this.getFingerprint(identifier);

      if (fingerprint && trustMatrix[Device.Trust.confirmed].indexOf(fingerprint) >= 0) {
         return Device.Trust.confirmed;
      }

      if (fingerprint && trustMatrix[Device.Trust.recognized].indexOf(fingerprint) >= 0) {
         return Device.Trust.recognized;
      }

      return Device.Trust.unknown;
   }

   public setTrust(identifier: Identifier, trust) {
      let address = new SignalProtocolAddress.fromString(identifier);
      let trustMatrix = this.getTrustMatrix(identifier);
      let fingerprint = this.getFingerprint(identifier);

      for (let trustLevel in trustMatrix) {
         trustMatrix[trustLevel] = trustMatrix[trustLevel].filter(fp => fp !== fingerprint);
      }

      trustMatrix[trust].push(fingerprint);

      this.put(PREFIX_TRUST + address.getName(), trustMatrix);

      return fingerprint;
   }

   private getTrustMatrix(identifier: Identifier) {
      let address = new SignalProtocolAddress.fromString(identifier);
      let trustMatrix = this.get(PREFIX_TRUST + address.getName()) || {
         [Device.Trust.confirmed]: [],
         [Device.Trust.recognized]: [],
      };

      return trustMatrix;
   }

   public getFingerprint(identifier: Identifier): string {
      let identityKey = new IdentityKeyClass(this.get(PREFIX_IDENTITYKEY + identifier));

      return identityKey.getFingerprint();
   }

   public async loadFingerprint(identifier: Identifier): Promise<string> {
      let identityKey = new IdentityKeyClass(await this.loadIdentityKey(identifier));

      this.saveIdentity(identifier, identityKey.getPublic());

      return identityKey.getFingerprint();
   }

   /**
    * Methods required by libsignal
    */
   public getIdentityKeyPair(): Promise<IdentityKeyPair> {
      return Promise.resolve(this.get('identityKey'));
   }

   public getLocalRegistrationId(): Promise<RegistrationId> {
      return Promise.resolve(this.get('registrationId'));
   }

   public put(key: string, value: any): void {
      if (typeof key === 'undefined' || typeof value === 'undefined' || key === null || value === null) {
         throw new Error('I will not store undefined or null');
      }

      let stringified = JSON.stringify(value, function(key, value) {
         if (value instanceof ArrayBuffer) {
            return 'stringifiedArrayBuffer|' + JSON.stringify(ArrayBufferUtils.toArray(value));
         }

         return value;
      });

      this.storage.setItem(PREFIX, key, { v: stringified });
   }

   public get(key: string, defaultValue?: any): any {
      if (typeof key === 'undefined' || key === null) {
         throw new Error('I cant get a value for a undefined or null key');
      }

      let data = this.storage.getItem(PREFIX, key);

      if (data) {
         return JSON.parse(data.v, function(key, value) {
            if (/^stringifiedArrayBuffer\|/.test(value)) {
               let cleaned = value.replace(/^stringifiedArrayBuffer\|/, '');

               return ArrayBufferUtils.fromArray(JSON.parse(cleaned));
            }

            return value;
         });
      }

      return defaultValue;
   }

   public remove(key: string): void {
      if (typeof key === 'undefined' || key === null) {
         throw new Error('I cant remove null or undefined key');
      }

      this.storage.removeItem(PREFIX, key);
   }

   public isTrustedIdentity(identifierName, identityKey: IdentityKey): Promise<boolean> {
      if (typeof identifierName === 'undefined' || identifierName === null) {
         throw new Error('Undefined or null is no valid identifier');
      }

      if (!(identityKey instanceof ArrayBuffer)) {
         throw new Error('Expected identityKey to be an ArrayBuffer');
      }

      let fingerprint = new IdentityKeyClass(identityKey).getFingerprint();
      let trustMatrix = this.getTrustMatrix(identifierName);

      if (trustMatrix[Device.Trust.confirmed].indexOf(fingerprint) > -1 ||
         trustMatrix[Device.Trust.recognized].indexOf(fingerprint) > -1) {
         return Promise.resolve(true);
      }

      return Promise.resolve(false);
   }

   public async loadIdentityKey(identifier: Identifier): Promise<IdentityKey> {
      if (identifier === null || identifier === undefined)
         throw new Error('Tried to get identity key for undefined/null key');

      let address = new SignalProtocolAddress.fromString(identifier);
      let identityKey = this.get(PREFIX_IDENTITYKEY + address.toString());

      if (identityKey) {
         return identityKey;
      }

      let bundle = await this.getPreKeyBundle(address);

      return bundle.identityKey;
   }

   public saveIdentity(identifier: Identifier, identityKey: IdentityKey): Promise<boolean> {
      if (identifier === null || identifier === undefined) {
         throw new Error('Tried to put identity key for undefined/null key');
      }

      let address = new SignalProtocolAddress.fromString(identifier);

      if (typeof identityKey === 'string') {
         identityKey = ArrayBufferUtils.fromString(identityKey);
      }

      if (identityKey.byteLength !== 33) {
         console.warn(`Identity key is ${identityKey.byteLength} byte long.`);
      }

      let existing = this.get(PREFIX_IDENTITYKEY + address.toString());
      this.put(PREFIX_IDENTITYKEY + address.toString(), identityKey);

      return Promise.resolve(existing && ArrayBufferUtils.isEqual(identityKey, existing));
   }

   public loadPreKey(keyId: KeyId): Promise<undefined | PreKeyPair> {
      let res = this.get(PREFIX_PREKEY + keyId);
      if (res !== undefined) {
         res = { pubKey: res.pubKey, privKey: res.privKey };
      }

      return Promise.resolve(res);
   }

   public storePreKey(keyId: KeyId, keyPair: PreKeyPair): Promise<void> {
      return Promise.resolve(this.put(PREFIX_PREKEY + keyId, keyPair));
   }

   public removePreKey(keyId: KeyId): Promise<void> {
      //@TODO publish new bundle

      return Promise.resolve(this.remove(PREFIX_PREKEY + keyId));
   }

   public loadSignedPreKey(keyId: KeyId): Promise<undefined | PreKeyPair> {
      let res = this.get(PREFIX_SIGNEDPREKEY + keyId);
      if (res !== undefined) {
         res = { pubKey: res.pubKey, privKey: res.privKey };
      }

      return Promise.resolve(res);
   }

   public storeSignedPreKey(keyId: KeyId, keyPair: PreKeyPair): Promise<void> {
      return Promise.resolve(this.put(PREFIX_SIGNEDPREKEY + keyId, keyPair));
   }

   public removeSignedPreKey(keyId: KeyId): Promise<void> {
      return Promise.resolve(this.remove(PREFIX_SIGNEDPREKEY + keyId));
   }

   public loadSession(identifier: Identifier): Promise<Session | undefined> {
      return Promise.resolve(this.get(PREFIX_SESSION + identifier));
   }

   public storeSession(identifier: Identifier, session: Session): Promise<void> {
      return Promise.resolve(this.put(PREFIX_SESSION + identifier, session));
   }

   public removeSession(identifier: Identifier): Promise<void> {
      return Promise.resolve(this.remove(PREFIX_SESSION + identifier));
   }

   public removeAllSessions(identifier: Identifier) {
      //@TODO implement removeAllSessions
      // for (var id in this.store) {
      //    if (id.startsWith(this.prefix + ':' + 'session' + identifier)) {
      //       localStorage.removeItem(this.prefix + ':' + id);
      //    }
      // }
      return Promise.resolve();
   }

   /**
    * Helper functions
    */
   public hasSession(identifier: Identifier): boolean {
      return !!this.get(PREFIX_SESSION + identifier)
   }

   public async getPreKeyBundle(address): Promise<SignalBundleObject> {
      let node = NS_BUNDLES + address.getDeviceId();
      let stanza;

      try {
         stanza = await this.pepService.retrieveItems(node, address.getName());
      } catch (errorStanza) {
         console.log('Error while retrieving bundle', errorStanza);

         throw 'Could not retrieve bundle';
      }


      let itemsElement = $(stanza).find(`items[node='${node}']`);
      let bundleElement = itemsElement.find(`bundle[xmlns='${NS_BASE}']`);

      if (bundleElement.length !== 1) {
         return Promise.reject('Found no bundle');
      }

      let bundle = Bundle.fromXML(bundleElement.get());

      //@REVIEW registrationId??? Gajim uses probably own registration id.
      return bundle.toSignalBundle(address.getDeviceId());
   }
}
