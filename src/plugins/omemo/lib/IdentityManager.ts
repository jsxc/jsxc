import Store from './Store';
import Address from '../vendor/Address';
import BundleManager from './BundleManager';
import IdentityKey from '../model/IdentityKey';

export default class {
   constructor(private store: Store, private bundleManager: BundleManager) {

   }

   public async loadFingerprint(identifier: Address): Promise<string> {
      let identityKey = await this.loadIdentityKey(identifier);

      this.store.saveIdentity(identifier, identityKey);

      return identityKey.getFingerprint();
   }

   public async loadIdentityKey(identifier: Address): Promise<IdentityKey> {
      let identityKey = this.store.getIdentityKey(identifier);

      if (identityKey) {
         return identityKey;
      }

      let bundle = await this.bundleManager.requestBundle(identifier);

      return bundle.getIdentityKey();
   }
}
