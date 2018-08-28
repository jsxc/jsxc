import Address from '../vendor/Address';
import Session from './Session';
import EncryptedDeviceMessage from '../model/EncryptedDeviceMessage';
import Store from './Store';

export enum Trust { unknown, recognized, confirmed };

export default class Device {

   constructor(private address: Address, private session: Session, private store: Store) {

   }

   public async decrypt(ciphertext, preKey: boolean = false): Promise<ArrayBuffer> {
      return this.session.decrypt(ciphertext, preKey);
   }

   public async encrypt(plaintext): Promise<EncryptedDeviceMessage | null> {
      return this.session.encrypt(plaintext);
   }

   public isCurrentDevice(): boolean {
      let currentDeviceAddress = this.store.getLocalDeviceAddress();

      return currentDeviceAddress.equals(this.address);
   }

   public getTrust(): Trust {
      return this.store.getTrust(this.address);
   }

   public setTrust(trust: Trust) {
      this.store.setTrust(this.address, trust);
   }

   public getFingerprint(): string {
      return this.store.getFingerprint(this.address);
   }

   public getId(): number {
      return this.address.getDeviceId();
   }

   public getUid(): string {
      return this.address.toString();
   }

   public getAddress(): Address {
      return this.address;
   }
}
