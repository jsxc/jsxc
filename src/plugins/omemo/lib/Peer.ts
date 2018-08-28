import Store from './Store'
import Device, { Trust } from './Device'
import * as AES from '../util/AES'
import Address from '../vendor/Address';
import BundleManager from './BundleManager';
import Session from './Session';
import EncryptedDeviceMessage from '../model/EncryptedDeviceMessage';

const MAX_PADDING = 10;
const PADDING_CHARACTER = '​\u200B';

export type EncryptedPeerMessage = {
   keys: EncryptedDeviceMessage[],
   iv: BufferSource,
   payload: ArrayBuffer,
};

export default class Peer {
   private static own: Peer;

   private devices: any = {};

   constructor(private deviceName: string, private store: Store, private bundleManager: BundleManager) {
   }

   public async encrypt(plaintext: string): Promise<EncryptedPeerMessage> {
      let remoteDeviceIds = this.store.getDeviceList(this.deviceName);

      if (remoteDeviceIds.length === 0) {
         throw 'Your contact does not support OMEMO.';
      }

      if (this.getTrust() === Trust.unknown) {
         throw 'There are new devices for your contact.';
      }

      if (Peer.getOwn().getTrust() === Trust.unknown) {
         throw 'I found new devices from you.';
      }

      while (plaintext.length < MAX_PADDING) {
         plaintext += PADDING_CHARACTER;
      }

      let aes = await AES.encrypt(plaintext);
      let devices = [...this.getDevices(), ...Peer.getOwn().getDevices()];
      let promises = devices.map(device => device.encrypt(aes.keydata));

      let keys = await Promise.all(promises);

      keys = keys.filter(key => key !== null);

      if (keys.length === 0) {
         throw 'Could not encrypt data with any Signal session';
      }

      return {
         keys: <EncryptedDeviceMessage[]>keys,
         iv: aes.iv,
         payload: aes.payload
      };
   }

   public decrypt(deviceId: number, ciphertext, preKey: boolean = false): Promise<ArrayBuffer> {
      let device = this.getDevice(deviceId);

      return device.decrypt(ciphertext, preKey);
   }

   public getTrust(): Trust {
      let trust = this.getDevices().map(device => device.getTrust());

      if (trust.indexOf(Trust.unknown) >= 0) {
         return Trust.unknown;
      }

      if (trust.indexOf(Trust.recognized) >= 0) {
         return Trust.recognized;
      }

      return Trust.confirmed;
   }

   public getDevices(): Device[] {
      let deviceIds = this.store.getDeviceList(this.deviceName);

      return deviceIds.map(id => this.getDevice(id));
   }

   private getDevice(id: number): Device {
      if (!this.devices[id]) {
         let address = new Address(this.deviceName, id);
         let session = new Session(address, this.store, this.bundleManager);

         this.devices[id] = new Device(address, session, this.store);
      }

      return this.devices[id];
   }

   public static getOwn(): Peer {
      if (!Peer.own) {
         throw 'Could not find own peer object.';
      }

      return Peer.own;
   }

   public static initOwnPeer(deviceName: string, store: Store, bundleManager: BundleManager) {
      if (Peer.own) {
         throw 'There is already my own peer object.';
      }

      //@REVIEW maybe set trust here
      Peer.own = new Peer(deviceName, store, bundleManager);
   }
}
