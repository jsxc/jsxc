import IStorage from '../../../Storage.interface'
import { IContact as Contact } from '../../../Contact.interface'
import { IMessage as Message } from '../../../Message.interface'
import { IConnection } from '../../../connection/Connection.interface'
import Store from './Store'
import Peer from './Peer'
import Bootstrap from './Bootstrap'
import JID from '../../../JID'
import { IJID } from '../../../JID.interface'
import Stanza from '../util/Stanza'
import { NS_BASE } from '../util/Const'
import ArrayBufferUtils from '../util/ArrayBuffer'
import * as AES from '../util/AES'
import Device, { Trust } from './Device'
import { Strophe } from '../../../vendor/Strophe'
import BundleManager from './BundleManager';
import IdentityManager from './IdentityManager';

export default class Omemo {
   private store: Store;

   private peers: any = {};

   private bootstrap: Bootstrap;

   private bundleManager: BundleManager;

   private identityManager: IdentityManager;

   private deviceName: string;

   constructor(storage: IStorage, private connection: IConnection) {
      this.deviceName = connection.getJID().bare;
      this.store = new Store(storage);
      this.bundleManager = new BundleManager(connection.getPEPService(), this.store);

      Peer.initOwnPeer(this.deviceName, this.store, this.bundleManager);
   }

   public getIdentityManager(): IdentityManager {
      if (!this.identityManager) {
         this.identityManager = new IdentityManager(this.store, this.bundleManager);
      }

      return this.identityManager;
   }

   public storeDeviceList(identifier: string, deviceList: number[]) {
      let ownJid = this.connection.getJID();

      if (ownJid.bare === identifier) {
         this.makeSureOwnDeviceIdIsInList(deviceList);
      }

      this.store.setDeviceList(identifier, deviceList);
   }

   private makeSureOwnDeviceIdIsInList(deviceList: number[]) {
      let ownDeviceId = this.store.getLocalDeviceId();

      if (this.store.isPublished() && typeof ownDeviceId === 'number'
         && !isNaN(ownDeviceId) && deviceList.indexOf(ownDeviceId) < 0) {
         this.bundleManager.publishDeviceId(ownDeviceId);
      }
   }

   public prepare(): Promise<void> {
      return this.getBootstrap().prepare();
   }

   public isTrusted(contact: Contact): boolean {
      let peer = this.getPeer(contact.getJid());
      let ownPeer = Peer.getOwn();

      return peer.getTrust() !== Trust.unknown && ownPeer.getTrust() !== Trust.unknown;
   }

   public getDevices(contact?: Contact): Array<Device> {
      let peer;

      if (contact) {
         peer = this.getPeer(contact.getJid());
      } else {
         peer = Peer.getOwn();
      }

      return peer.getDevices();
   }

   public encrypt(contact: Contact, message: Message, xmlElement: Strophe.Builder) {
      let peer = this.getPeer(contact.getJid());

      return peer.encrypt(message.getPlaintextMessage()).then((encryptedMessages) => {
         let stanza = Stanza.buildEncryptedStanza(encryptedMessages, this.store.getLocalDeviceId());

         $(xmlElement.tree()).find(`html[xmlns="${Strophe.NS.XHTML_IM}"]`).remove();
         $(xmlElement.tree()).find('>body').remove();

         xmlElement.cnode(stanza.tree());
         xmlElement.up().c('store', {
            xmlns: 'urn:xmpp:hints'
         }).up();

         xmlElement.c('body').t('***You received an OMEMO encrypted message***').up();

         message.setEncrypted(true);

         return [message, xmlElement];
      }).catch((msg) => {
         message.setErrorMessage('Message was not send');
         message.setEncrypted(false);

         contact.addSystemMessage(msg);

         throw msg;
      });
   }

   public async decrypt(stanza): Promise<string | void> {
      let messageElement = $(stanza);

      if (messageElement.prop('tagName') !== 'message') {
         throw 'Root element is no message element';
      }

      let encryptedElement = $(stanza).find(`>encrypted[xmlns="${NS_BASE}"]`);

      if (encryptedElement.length === 0) {
         throw 'No encrypted stanza found';
      }

      let from = new JID(messageElement.attr('from'));
      let encryptedData = Stanza.parseEncryptedStanza(encryptedElement);

      if (!encryptedData) {
         throw 'Could not parse encrypted stanza';
      }

      let ownDeviceId = this.store.getLocalDeviceId();
      let ownPreKeyFiltered = encryptedData.keys.filter(function(preKey) {
         return ownDeviceId === preKey.deviceId;
      });

      if (ownPreKeyFiltered.length !== 1) {
         return Promise.reject(`Found ${ownPreKeyFiltered.length} PreKeys which match my device id (${ownDeviceId}).`);
      }

      //@TODO remove own prekey id from bundle???

      let ownPreKey = ownPreKeyFiltered[0];
      let peer = this.getPeer(from);
      let exportedKey;

      try {
         exportedKey = await peer.decrypt(encryptedData.sourceDeviceId, ownPreKey.ciphertext, ownPreKey.preKey);
      } catch (err) {
         throw 'Error during decryption: ' + err;
      }

      let exportedAESKey = exportedKey.slice(0, 16);
      let authenticationTag = exportedKey.slice(16);

      if (authenticationTag.byteLength < 16) {
         throw "Authentication tag too short";
      }

      let iv = (<any>encryptedData).iv;
      let ciphertextAndAuthenticationTag = ArrayBufferUtils.concat((<any>encryptedData).payload, authenticationTag);

      return AES.decrypt(exportedAESKey, iv, ciphertextAndAuthenticationTag);
   }

   private getPeer(jid: IJID): Peer {
      if (!this.peers[jid.bare]) {
         this.peers[jid.bare] = new Peer(jid.bare, this.store, this.bundleManager);
      }

      return this.peers[jid.bare];
   }

   private getBootstrap(): Bootstrap {
      if (!this.bootstrap) {
         this.bootstrap = new Bootstrap(this.deviceName, this.store, this.bundleManager);
      }

      return this.bootstrap;
   }
}
