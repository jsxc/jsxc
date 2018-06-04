import Store from './Store'
import Device from './Device'
import { IJID } from '../../../JID.interface'
import { KeyHelper, SignalProtocolAddress, SessionBuilder, SessionCipher } from '../vendor/Signal'
import ArrayBufferUtils from '../util/ArrayBuffer'
import * as AES from '../util/AES'

export default class Peer {
   private static ownJid: IJID;

   private static ownDevices: any = {};

   private devices: any = {};

   constructor(private jid: IJID, private store: Store) {
   }

   public async encrypt(plaintext: string) {
      let remoteDeviceIds = this.store.getDeviceList(this.jid.bare);
      let ownDeviceIds = this.store.getOwnDeviceList().filter((id) => {
         return id !== this.store.getDeviceId(); //@REVIEW MAM
      });

      if (remoteDeviceIds.length === 0) {
         throw 'Your contact does not support OMEMO.';
      }

      let aes = await AES.encrypt(plaintext);
      let promises = [];

      for (let id of remoteDeviceIds) {
         let device = this.getDevice(id);

         promises.push(device.encrypt(aes.keydata));
      }

      for (let id of ownDeviceIds) {
         let device = this.getOwnDevice(id);

         promises.push(device.encrypt(aes.keydata));
      }

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

   private getDevice(id: number): Device {
      if (!this.devices[id]) {
         this.devices[id] = new Device(this.jid, id, this.store);
      }

      return this.devices[id];
   }

   private getOwnDevice(id: number): Device {
      if (!Peer.ownDevices[id]) {
         Peer.ownDevices[id] = new Device(Peer.ownJid, id, this.store);
      }

      return Peer.ownDevices[id];
   }

   public static setOwnJid(jid: IJID) {
      Peer.ownJid = jid;
   }
}
