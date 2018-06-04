//import Storage from '../../../Storage'
import { SignalProtocolAddress } from '../vendor/Signal'
import SignalStore, { IdentityKeyPair, IdentityKey, Identifier, RegistrationId, PreKeyPair, KeyId, Session } from '../vendor/SignalStore.interface'
import { SignalBundleObject } from './ObjectTypes'
import Bundle from './Bundle'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { NS_BASE, NS_BUNDLES } from '../util/Const'

const PREFIX = 'store';
const PREFIX_SESSION = 'session:';
const PREFIX_IDENTITYKEY = 'identityKey:';
const PREFIX_PREKEY = '25519KeypreKey:';
const PREFIX_SIGNEDPREKEY = '25519KeysignedKey:';

export default class Store implements SignalStore {
   public Direction = {
      SENDING: 1,
      RECEIVING: 2
   };

   constructor(private storage, private pepService) { //@TODO add ts type

   }

   public getOwnDeviceList(): number[] {
      return this.get('deviceList', []);
   }

   public setOwnDeviceList(deviceList: number[]) {
      this.put('deviceList', deviceList);
   }

   public getDeviceList(identifier) {
      return this.get('deviceList:' + identifier, []);
   }

   public setDeviceList(identifier, deviceList: number[]) {
      this.put('deviceList:' + identifier, deviceList);
   }

   public isReady(): boolean {
      return this.get('deviceId') && this.get('identityKey') && this.get('registrationId');
   }

   public isPublished(): boolean {
      return this.get('published') === 'true' || this.get('published') === true;
   }

   public getDeviceId(): number {
      return parseInt(this.get('deviceId'));
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
            return ArrayBufferUtils.toArray(value)
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
            if (/Key$/.test(key)) {
               return ArrayBufferUtils.fromArray(value);
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

   // identifier is only name and not name.deviceId
   public isTrustedIdentity(identifier, identityKey: IdentityKey): Promise<boolean> {
      if (typeof identifier === 'undefined' || identifier === null) {
         throw new Error('Undefined or null is no valid identifier');
      }

      if (!(identityKey instanceof ArrayBuffer)) {
         throw new Error('Expected identityKey to be an ArrayBuffer');
      }

      let trusted = this.get(PREFIX_IDENTITYKEY + identifier);
      if (typeof trusted === 'undefined') {
         return Promise.resolve(true);
      }

      return Promise.resolve(true); //@TODO
      // return Promise.resolve(ArrayBufferUtils.isEqual(identityKey, trusted));
   }

   public loadIdentityKey(identifier: Identifier): Promise<IdentityKey> {
      if (identifier === null || identifier === undefined)
         throw new Error('Tried to get identity key for undefined/null key');

      let address = new SignalProtocolAddress.fromString(identifier);

      return Promise.resolve(this.get(PREFIX_IDENTITYKEY + address.toString()));
   }

   public saveIdentity(identifier: Identifier, identityKey: IdentityKey): Promise<boolean> {
      if (identifier === null || identifier === undefined)
         throw new Error('Tried to put identity key for undefined/null key');

      let address = new SignalProtocolAddress.fromString(identifier);

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
      return bundle.toSignalBundle(address.getDeviceId())
   }
}
