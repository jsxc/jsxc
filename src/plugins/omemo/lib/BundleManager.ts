import PEP from '@connection/services/PEP';
import Address from '../vendor/Address';
import { NS_BUNDLES, NS_BASE, NS_DEVICELIST, NUM_PRE_KEYS, MAX_PRE_KEY_ID } from '../util/Const'
import Bundle from './Bundle';
import Log from '@util/Log';
import IdentityKey from '../model/IdentityKey';
import PreKey from '../model/PreKey';
import SignedPreKey from '../model/SignedPreKey';
import { KeyHelper } from '../vendor/KeyHelper';
import Store from './Store';
import { $build } from '../../../vendor/Strophe'
import Random from '@util/Random';

export default class BundleManager {
   constructor(private pepService: PEP, private store: Store) {

   }

   public async refreshBundle(): Promise<Bundle> {
      Log.debug('Refresh local device bundle.');

      let identityKey = this.store.getLocalIdentityKey();

      let preKeyIds = this.store.getPreKeyIds();
      let signedPreKeyIds = this.store.getSignedPreKeyIds();

      let newKeyIds = this.generateUniqueKeyIds(NUM_PRE_KEYS - preKeyIds.length, preKeyIds);

      await Promise.all(newKeyIds.map(id => this.generatePreKey(id)));

      if (signedPreKeyIds.length !== 1) {
         throw new Error(`Could not refresh local device bundle, because we have ${signedPreKeyIds.length} signed prekeys.`);
      }

      return new Bundle({
         identityKey,
         signedPreKey: this.store.getSignedPreKey(signedPreKeyIds[0]),
         preKeys: this.store.getAllPreKeys(),
      });
   }

   public async generateBundle(identityKey: IdentityKey): Promise<Bundle> {
      Log.debug('Generate local device bundle.');

      let preKeyPromises: Promise<PreKey>[];
      let ids = this.generateUniqueKeyIds(NUM_PRE_KEYS);
      let signedPreKeyId = ids.pop();

      preKeyPromises = ids.map(id => this.generatePreKey(id));

      preKeyPromises.push(this.generateSignedPreKey(identityKey, signedPreKeyId));

      let preKeys = await Promise.all(preKeyPromises);

      return new Bundle({
         identityKey,
         signedPreKey: <SignedPreKey> preKeys.pop(),
         preKeys
      });
   }

   private generateUniqueKeyIds(quantity: number, list: number[] = []) {
      let ids = [];

      while (ids.length < quantity) {
         let id = Random.number(MAX_PRE_KEY_ID, 1);

         if (ids.indexOf(id) < 0) {
            ids.push(id);
         }
      }

      return ids;
   }

   private async generatePreKey(id: number): Promise<PreKey> {
      let preKey = await KeyHelper.generatePreKey(id);

      this.store.storePreKey(preKey);

      return preKey;
   }

   private async generateSignedPreKey(identityKey: IdentityKey, id: number): Promise<SignedPreKey> {
      let signedPreKey = await KeyHelper.generateSignedPreKey(identityKey, id);

      this.store.storeSignedPreKey(signedPreKey);

      return signedPreKey;
   }

   public async requestBundle(address: Address): Promise<Bundle> {
      let node = NS_BUNDLES + address.getDeviceId();
      let stanza;

      try {
         stanza = await this.pepService.retrieveItems(node, address.getName());
      } catch (errorStanza) {
         Log.warn('Error while retrieving bundle', errorStanza);

         throw new Error('Could not retrieve bundle');
      }

      let itemsElement = $(stanza).find(`items[node='${node}']`);
      let bundleElement = itemsElement.find(`bundle[xmlns='${NS_BASE}']`);

      if (bundleElement.length !== 1) {
         throw new Error(`Expected to find one bundle, but there are actually ${bundleElement.length} bundles.`);
      }

      let bundle = Bundle.fromXML(bundleElement.get());

      return bundle;
   }

   public async publishBundle(bundle: Bundle): Promise<void> {
      let node = NS_BUNDLES + this.store.getLocalDeviceId();

      await this.pepService.publish(node, bundle.toXML().tree(), 'current');
      this.store.setPublished(true);
   }

   public publishDeviceId(deviceId: number): Promise<Element> {
      let localDeviceName = this.store.getLocalDeviceName();
      let deviceIds = this.store.getDeviceList(localDeviceName);

      if (deviceIds.indexOf(deviceId) < 0) {
         deviceIds.push(deviceId);
      }

      let xmlList = $build('list', { xmlns: NS_BASE });

      for (let id of deviceIds) {
         xmlList.c('device', { id }).up();
      }

      return this.pepService.publish(NS_DEVICELIST, xmlList.tree(), 'current');
   }
}
