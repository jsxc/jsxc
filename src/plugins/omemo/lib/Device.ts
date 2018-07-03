import { IJID } from '../../../JID.interface'
import { SignalProtocolAddress, SessionBuilder, SessionCipher } from '../vendor/Signal'
import Store from './Store'

interface EncryptedDeviceMessage {
   preKey: boolean
   ciphertext: string
   deviceId: number
}

enum Trust { unknown, recognized, confirmed };

export default class Device {
   private session;

   private address;

   public static Trust = Trust;

   constructor(jid: IJID, private id: number, private store: Store) {
      this.address = new SignalProtocolAddress(jid.bare, id);
   }

   public async decrypt(ciphertext, preKey: boolean = false): Promise<ArrayBuffer> {
      let sessionCipher = new SessionCipher(this.store, this.address);
      let plaintextBuffer;

      if (preKey)
         plaintextBuffer = await sessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
      else
         plaintextBuffer = await sessionCipher.decryptWhisperMessage(ciphertext, 'binary');

      return plaintextBuffer;
   }

   public async encrypt(plaintext): Promise<EncryptedDeviceMessage | null> {
      try {
         if (!this.store.hasSession(this.address.toString())) {
            await this.establishSession();
         }

         let session = this.getSession();
         let ciphertext = await session.encrypt(plaintext);

         return {
            preKey: ciphertext.type === 3,
            ciphertext: ciphertext,
            deviceId: this.address.getDeviceId()
         }
      } catch (err) {
         console.log('Error:', err)
         console.warn('Could not encrypt data for device with id ' + this.address.getDeviceId());

         return null; // Otherwise Promise.all throws an error
      }
   }

   public isCurrentDevice(): boolean {
      let currentDeviceAddress = this.store.getDeviceAddress();

      return currentDeviceAddress.toString() === this.address.toString();
   }

   public getTrust(): Trust {
      return this.store.getTrust(this.address.toString());
   }

   public setTrust(trust: Trust) {
      this.store.setTrust(this.address.toString(), trust);
   }

   public getFingerprint(): string {
      return this.store.getFingerprint(this.address.toString());
   }

   public loadFingerprint(): Promise<string> {
      return this.store.loadFingerprint(this.address.toString());
   }

   public getId(): number {
      return this.id;
   }

   public getUid(): string {
      return this.address.toString();
   }

   private processPreKeyMessage = (preKeyBundle) => {
      let builder = new SessionBuilder(this.store, this.address);

      return builder.processPreKey(preKeyBundle);
   }

   private async establishSession() {
      let signalBundle = await this.store.getPreKeyBundle(this.address);

      this.processPreKeyMessage(signalBundle);
   }

   private getSession() {
      if (!this.session) {
         this.session = new SessionCipher(this.store, this.address);
      }

      return this.session;
   }
}
