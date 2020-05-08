import Store from './Store'
import { KeyHelper } from '../vendor/KeyHelper';
import Random from '../../../util/Random'
import Log from '../../../util/Log'
import BundleManager from './BundleManager';
import { MAX_REGISTRATION_ID } from '../util/Const';

export default class Bootstrap {
   constructor(private deviceName: string, private store: Store, private bundleManager: BundleManager) {

   }

   public async prepare(): Promise<void> {
      if (!this.store.isPublished()) {
         if (!this.store.isReady()) {
            await this.setup();
         }

         let identityKey = this.store.getLocalIdentityKey();
         let bundle = await this.bundleManager.generateBundle(identityKey);
         let deviceId = this.store.getLocalDeviceId();

         await this.bundleManager.publishBundle(bundle);
         await this.bundleManager.publishDeviceId(deviceId);
      } else if (this.store.getPublishedVersion() === 0) {
         Log.info('Refresh broken bundle');

         let bundle = await this.bundleManager.refreshBundle();
         await this.bundleManager.publishBundle(bundle);
      }

      Log.debug('Local device prepared.');
   }

   private setup(): Promise<void> {
      return Promise.all([
         this.generateDeviceId(),
         this.getDeviceName(),
         KeyHelper.generateIdentityKey(),
         KeyHelper.generateRegistrationId(),
      ]).then(([deviceId, deviceName, identityKey, registrationId]) => {
         this.store.setLocalDeviceId(deviceId);
         this.store.setLocalDeviceName(deviceName);
         this.store.setLocalIdentityKey(identityKey);
         this.store.setLocalRegistrationId(registrationId);
      });
   }

   private generateDeviceId(): Promise<number> {
      return Promise.resolve(Random.number(MAX_REGISTRATION_ID, 1));
   }

   private getDeviceName(): Promise<string> {
      return Promise.resolve(this.deviceName);
   }
}
