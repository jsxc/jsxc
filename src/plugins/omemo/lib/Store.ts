import IStorage from '../../../Storage.interface'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { Trust } from './Device'
import IdentityKey from '../model/IdentityKey';
import SignedPreKey from '../model/SignedPreKey';
import PreKey from '../model/PreKey';
import Address from '../vendor/Address';
import SignalStore, { DIRECTION } from '../vendor/SignalStore';

const PREFIX = 'store';
const PREFIX_SESSION = 'session:';
const PREFIX_IDENTITY_KEY = 'identityKey:';
const PREFIX_PREKEY = '25519KeypreKey:';
const PREFIX_SIGNED_PREKEY = '25519KeysignedKey:';
const PREFIX_TRUST = 'trust:';
const PREFIX_DEVICE_LIST = 'deviceList:';
const PREFIX_DEVICE_USED = 'deviceUsed:';

const KEY_DISABLED_DEVICES = 'disabledDevices';

export default class Store {

   private signalStore: SignalStore;

   constructor(private storage: IStorage) {

   }

   public getSignalStore(): SignalStore {
      if (!this.signalStore) {
         this.signalStore = new SignalStore(this);
      }

      return this.signalStore;
   }

   private put(key: string, value: any): void {
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

   private get(key: string, defaultValue?: any): any {
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

   private remove(key: string): void {
      if (typeof key === 'undefined' || key === null) {
         throw new Error('I cant remove null or undefined key');
      }

      this.storage.removeItem(PREFIX, key);
   }

   public isReady(): boolean {
      return this.get('deviceId') && this.get('deviceName') && this.get('identityKey') && this.get('registrationId');
   }

   public getPublishedVersion(): number {
      return parseInt(this.get('publishedVersion', 0), 10);
   }

   public isPublished(): boolean {
      return this.get('published') === 'true' || this.get('published') === true;
   }

   public setPublished(published: boolean) {
      if (published) {
         this.put('publishedVersion', 1);
      }

      return this.put('published', published);
   }

   public getDeviceList(deviceName: string): number[] {
      return this.get(PREFIX_DEVICE_LIST + deviceName, []);
   }

   public setDeviceList(deviceName: string, deviceList: number[]) {
      this.put(PREFIX_DEVICE_LIST + deviceName, deviceList);
   }

   public setPeerUsed(deviceName: string) {
      this.put(PREFIX_DEVICE_USED + deviceName, true);
   }

   public isPeerUsed(deviceName: string): boolean {
      let value = this.get(PREFIX_DEVICE_USED + deviceName);

      return typeof value === 'boolean' ? value : false;
   }

   public setLocalDeviceId(id: number) {
      this.put('deviceId', id);
   }

   public getLocalDeviceId(): number {
      return parseInt(this.get('deviceId'), 10);
   }

   public setLocalDeviceName(name: string) {
      this.put('deviceName', name);
   }

   public getLocalDeviceName(): string {
      return this.get('deviceName');
   }

   public getLocalDeviceAddress(): Address {
      let name = this.getLocalDeviceName();
      let id = this.getLocalDeviceId();

      if (!name || !id) {
         throw new Error('Local device address not generated yet');
      }

      return new Address(name, id);
   }

   public setLocalRegistrationId(id: number) {
      this.put('registrationId', id);
   }

   public getLocalRegistrationId(): number {
      return parseInt(this.get('registrationId'), 10);
   }

   public setLocalIdentityKey(identityKey: IdentityKey) {
      let address = this.getLocalDeviceAddress();

      // we have to save it twice to not loose the private key part
      this.put('identityKey', identityKey.export());

      this.saveIdentity(address, identityKey);
      this.setTrust(address, Trust.confirmed);
   }

   public getLocalIdentityKey(): IdentityKey {
      let data = this.get('identityKey');

      if (!data) {
         throw new Error('Found no local identity key');
      }

      return new IdentityKey(data);
   }

   public disable(identifier: Address) {
      let disabledDevices: number[] = this.storage.getItem(KEY_DISABLED_DEVICES, identifier.getName()) || [];

      if (disabledDevices.indexOf(identifier.getDeviceId()) < 0) {
         disabledDevices.push(identifier.getDeviceId());

         this.storage.setItem(KEY_DISABLED_DEVICES, identifier.getName(), disabledDevices);
      }
   }

   public enable(identifier: Address) {
      let disabledDevices: number[] = this.storage.getItem(KEY_DISABLED_DEVICES, identifier.getName()) || [];
      let index = disabledDevices.indexOf(identifier.getDeviceId());

      if (index > -1) {
         disabledDevices.splice(index, 1);

         this.storage.setItem(KEY_DISABLED_DEVICES, identifier.getName(), disabledDevices);
      }
   }

   public isDisabled(identifier: Address) {
      let disabledDevices: number[] = this.storage.getItem(KEY_DISABLED_DEVICES, identifier.getName()) || [];

      return disabledDevices.indexOf(identifier.getDeviceId()) > -1;
   }

   public getTrust(identifier: Address): Trust {
      let trustMatrix = this.getTrustMatrix(identifier);
      let fingerprint = this.getFingerprint(identifier);

      if (fingerprint && trustMatrix[Trust.confirmed].indexOf(fingerprint) >= 0) {
         return Trust.confirmed;
      }

      if (fingerprint && trustMatrix[Trust.recognized].indexOf(fingerprint) >= 0) {
         return Trust.recognized;
      }

      if (fingerprint && trustMatrix[Trust.ignored].indexOf(fingerprint) >= 0) {
         return Trust.ignored;
      }

      return Trust.unknown;
   }

   public setTrust(identifier: Address, trust: Trust) {
      let trustMatrix = this.getTrustMatrix(identifier);
      let fingerprint = this.getFingerprint(identifier);

      if (!fingerprint) {
         throw new Error('Can not trust without a fingerprint')
      }

      for (let trustLevel in trustMatrix) {
         trustMatrix[trustLevel] = trustMatrix[trustLevel].filter(fp => fp !== fingerprint);
      }

      trustMatrix[trust].push(fingerprint);

      this.put(PREFIX_TRUST + identifier.getName(), trustMatrix);

      return fingerprint;
   }

   private getTrustMatrix(identifier: Address) {
      let trustMatrix = this.get(PREFIX_TRUST + identifier.getName()) || {
         [Trust.confirmed]: [],
         [Trust.recognized]: [],
         [Trust.ignored]: [],
      };

      return trustMatrix;
   }

   public getFingerprint(identifier: Address): string | undefined {
      let identityKey = this.getIdentityKey(identifier);

      return identityKey ? identityKey.getFingerprint() : undefined;
   }

   public isTrustedIdentity(identifier: Address, identityKey: IdentityKey, direction: number): Promise<boolean> {
      let fingerprint = identityKey.getFingerprint();
      let trustMatrix = this.getTrustMatrix(identifier);

      if (trustMatrix[Trust.confirmed].indexOf(fingerprint) > -1 ||
         trustMatrix[Trust.recognized].indexOf(fingerprint) > -1 ||
         direction === DIRECTION.RECEIVING) {
         return Promise.resolve(true);
      }

      return Promise.resolve(false);
   }

   public saveIdentity(identifier: Address, identityKey: IdentityKey): Promise<boolean> {
      let existing = this.getIdentityKey(identifier);
      this.setIdentityKey(identifier, identityKey);

      return Promise.resolve(existing && ArrayBufferUtils.isEqual(identityKey.getPublic(), existing.getPublic()));
   }

   public getIdentityKey(identifier: Address): IdentityKey | undefined {
      let data = this.get(PREFIX_IDENTITY_KEY + identifier.toString());

      if (data) {
         return new IdentityKey(data);
      }
   }

   private setIdentityKey(identifier: Address, identityKey: IdentityKey) {
      this.put(PREFIX_IDENTITY_KEY + identifier.toString(), identityKey.export());
   }

   public getPreKeyIds(): number[] {
      return this.get('preKeyIds') || [];
   }

   public getAllPreKeys(): PreKey[] {
      let preKeyIds = this.get('preKeyIds') || [];

      return preKeyIds.map(id => this.getPreKey(id));
   }

   public getNumberOfPreKeys(): number {
      let preKeyIds = this.get('preKeyIds') || [];

      return preKeyIds.length;
   }

   public getPreKey(keyId: number): undefined | PreKey {
      let preKey;
      let data = this.get(PREFIX_PREKEY + keyId);

      if (data !== undefined) {
         preKey = new PreKey(data);
      }

      return preKey;
   }

   public storePreKey(preKey: PreKey) {
      let preKeyIds = this.get('preKeyIds') || [];

      if (preKeyIds.indexOf(preKey.getId()) < 0) {
         preKeyIds.push(preKey.getId());

         this.put('preKeyIds', preKeyIds);
      }

      this.put(PREFIX_PREKEY + preKey.getId(), preKey.export());
   }

   public removePreKey(keyId: number): Promise<void> {
      let preKeyIds: number[] = this.get('preKeyIds') || [];

      this.put('preKeyIds', preKeyIds.filter(id => id !== keyId));

      return Promise.resolve(this.remove(PREFIX_PREKEY + keyId));
   }

   public getSignedPreKeyIds(): number[] {
      return this.get('signedPreKeyIds') || [];
   }

   public getSignedPreKey(keyId: number): undefined | SignedPreKey {
      let signedPreKey;
      let data = this.get(PREFIX_SIGNED_PREKEY + keyId);
      if (data !== undefined) {
         signedPreKey = new SignedPreKey(data);
      }

      return signedPreKey;
   }

   public storeSignedPreKey(signedPreKey: SignedPreKey) {
      let ids = this.get('signedPreKeyIds') || [];

      if (ids.indexOf(signedPreKey.getId()) < 0) {
         ids.push(signedPreKey.getId());

         this.put('signedPreKeyIds', ids);
      }

      this.put(PREFIX_SIGNED_PREKEY + signedPreKey.getId(), signedPreKey.export())
   }

   public removeSignedPreKey(keyId: number): Promise<void> {
      let ids: number[] = this.get('signedPreKeyIds') || [];

      this.put('signedPreKeyIds', ids.filter(id => id !== keyId));

      return Promise.resolve(this.remove(PREFIX_SIGNED_PREKEY + keyId));
   }

   public loadSession(identifier: string): Promise<string | undefined> {
      return Promise.resolve(this.get(PREFIX_SESSION + identifier));
   }

   public storeSession(identifier: string, session: string): Promise<void> {
      return Promise.resolve(this.put(PREFIX_SESSION + identifier, session));
   }

   public removeSession(identifier: string): Promise<void> {
      return Promise.resolve(this.remove(PREFIX_SESSION + identifier));
   }

   public removeAllSessions(identifier: string) {
      //@TODO implement removeAllSessions

      return Promise.resolve();
   }

   public setLastUsed(identifier: Address) {
      this.put('lastUsed:' + identifier.toString(), new Date());
   }

   public getLastUsed(identifier: Address) {
      let used = this.get('lastUsed:' + identifier.toString());
      return used ? new Date(used) : undefined;
   }

   /**
    * Helper functions
    */
   public hasSession(identifier: string): boolean {
      return !!this.get(PREFIX_SESSION + identifier)
   }
}
