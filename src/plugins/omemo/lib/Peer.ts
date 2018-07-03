import Store from './Store'
import Device from './Device'
import { IJID } from '../../../JID.interface'
import { KeyHelper, SignalProtocolAddress, SessionBuilder, SessionCipher } from '../vendor/Signal'
import ArrayBufferUtils from '../util/ArrayBuffer'
import * as AES from '../util/AES'

export default class Peer {
   private static own: Peer;

   private devices: any = {};

   constructor(private jid: IJID, private store: Store) {
   }

   public async encrypt(plaintext: string) {
      let remoteDeviceIds = this.store.getDeviceList(this.jid.bare);

      if (remoteDeviceIds.length === 0) {
         throw 'Your contact does not support OMEMO.';
      }

      if (this.getTrust() === Device.Trust.unknown) {
         throw 'There are new devices for your contact.';
      }

      if (Peer.getOwn().getTrust() === Device.Trust.unknown) {
         throw 'I found new devices from you.';
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
         keys: keys,
         iv: aes.iv,
         payload: aes.payload
      };
   }

   public decrypt(deviceId: number, ciphertext, preKey: boolean = false) {
      let device = this.getDevice(deviceId);

      return device.decrypt(ciphertext, preKey);
   }

   public getTrust() {
      let trust = this.getDevices().map(device => device.getTrust());

      if (trust.indexOf(Device.Trust.unknown) >= 0) {
         return Device.Trust.unknown;
      }

      if (trust.indexOf(Device.Trust.recognized) >= 0) {
         return Device.Trust.recognized;
      }

      return Device.Trust.confirmed;
   }

   public getDevices(): Device[] {
      let deviceIds = this.store.getDeviceList(this.jid.bare);

      return deviceIds.map(id => this.getDevice(id));
   }

   private getDevice(id: number): Device {
      if (!this.devices[id]) {
         this.devices[id] = new Device(this.jid, id, this.store);
      }

      return this.devices[id];
   }

   public static getOwn() {
      if (!Peer.own) {
         throw 'Could not find own peer object.';
      }

      return Peer.own;
   }

   public static initOwnPeer(jid: IJID, store: Store) {
      if (Peer.own) {
         throw 'There is already my own peer object.';
      }
      //@REVIEW maybe set trust here
      Peer.own = new Peer(jid, store);
   }
}
