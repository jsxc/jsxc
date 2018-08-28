import PEP from "@connection/services/PEP";
import Address from "../vendor/Address";
import { NS_BUNDLES, NS_BASE, NS_DEVICELIST, NUM_PRE_KEYS } from "../util/Const"
import Bundle from "./Bundle";
import Log from "@util/Log";
import IdentityKey from "../model/IdentityKey";
import PreKey from "../model/PreKey";
import SignedPreKey from "../model/SignedPreKey";
import { KeyHelper } from "../vendor/KeyHelper";
import Store from "./Store";
import { $build } from '../../../vendor/Strophe'

export default class BundleManager {
   constructor(private pepService: PEP, private store: Store) {

   }

   public async generateBundle(identityKey: IdentityKey): Promise<Bundle> {
      Log.debug('Generate local device bundle.');

      let preKeyPromises: Promise<PreKey>[] = [];

      for (let i = 0; i < NUM_PRE_KEYS; i++) {
         preKeyPromises.push(this.generatePreKey(i));
      }

      preKeyPromises.push(this.generateSignedPreKey(identityKey, 1)); //@REVIEW signed prekey id

      let preKeys = await Promise.all(preKeyPromises);

      return new Bundle({
         identityKey: identityKey,
         signedPreKey: <SignedPreKey>preKeys.pop(),
         preKeys: preKeys
      });
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
         console.log('Error while retrieving bundle', errorStanza);

         throw 'Could not retrieve bundle';
      }

      let itemsElement = $(stanza).find(`items[node='${node}']`);
      let bundleElement = itemsElement.find(`bundle[xmlns='${NS_BASE}']`);

      if (bundleElement.length !== 1) {
         return Promise.reject('Found no bundle');
      }

      let bundle = Bundle.fromXML(bundleElement.get());

      return bundle;
   }

   public async publishBundle(deviceId: number, bundle: Bundle): Promise<void> {
      let node = NS_BUNDLES + this.store.getLocalDeviceId();

      await this.pepService.publish(node, bundle.toXML().tree());
      this.store.setPublished(true);

      await this.publishDeviceId(deviceId);
   }

   public publishDeviceId(deviceId: number): Promise<Element> {
      let localDeviceName = this.store.getLocalDeviceName();
      let deviceIds = this.store.getDeviceList(localDeviceName);

      if (deviceIds.indexOf(deviceId) < 0) {
         deviceIds.push(deviceId);
      }

      let xmlList = $build('list', { xmlns: NS_BASE });

      for (let id of deviceIds) {
         xmlList.c('device', { id: id }).up();
      }

      return this.pepService.publish(NS_DEVICELIST, xmlList.tree());
   }
}
