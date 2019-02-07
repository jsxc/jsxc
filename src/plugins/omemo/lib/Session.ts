import Address from '../vendor/Address';
import Store from './Store';
import BundleManager from './BundleManager';
import EncryptedDeviceMessage from '../model/EncryptedDeviceMessage';
import { SessionCipher } from '../vendor/SessionCipher';
import { SessionBuilder } from '../vendor/SessionBuilder';
import Bundle from './Bundle';
import Log from '@util/Log';

export default class Session {
   private sessionCipher;

   constructor(private address: Address, private store: Store, private bundleManager: BundleManager) {

   }

   public async decrypt(ciphertext, preKey: boolean = false): Promise<ArrayBuffer> {
      let sessionCipher = this.getSessionCipher();
      let plaintextBuffer;

      if (preKey) {
         plaintextBuffer = await sessionCipher.decryptPreKeyMessage(ciphertext);
      } else {
         plaintextBuffer = await sessionCipher.decryptMessage(ciphertext);
      }

      return plaintextBuffer;
   }

   public async encrypt(plaintext): Promise<EncryptedDeviceMessage | null> {
      try {
         if (!this.store.hasSession(this.address.toString())) {
            await this.establishSession();
         }

         let session = this.getSessionCipher();
         let ciphertext = await session.encryptMessage(plaintext);

         return new EncryptedDeviceMessage(this.address, ciphertext);
      } catch (err) {
         Log.warn('Could not encrypt data for device with id ' + this.address.getDeviceId(), err);

         return null; // Otherwise Promise.all throws an error
      }
   }

   private async establishSession() {
      let bundle = await this.bundleManager.requestBundle(this.address);

      await this.processPreKeyMessage(bundle);
   }

   private processPreKeyMessage = (bundle: Bundle): Promise<void> => {
      let builder = new SessionBuilder(this.address, this.store);

      return builder.processPreKey(bundle).then(() => undefined);
   }

   private getSessionCipher(): SessionCipher {
      if (!this.sessionCipher) {
         this.sessionCipher = new SessionCipher(this.address, this.store);
      }

      return this.sessionCipher;
   }
}
