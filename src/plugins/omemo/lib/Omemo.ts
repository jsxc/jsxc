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

export default class Omemo {
   private store: Store;

   private peers: any = {};

   private bootstrap: Bootstrap;

   constructor(private storage, private connection: IConnection) {
      this.store = new Store(storage, connection.getPEPService());

      Peer.setOwnJid(connection.getJID());
   }

   public storeOwnDeviceList(deviceList: number[]) {
      let ownDeviceId = this.store.getDeviceId();

      if (this.store.isPublished() && typeof ownDeviceId === 'number'
         && !isNaN(ownDeviceId) && deviceList.indexOf(ownDeviceId) < 0) {
         this.getBootstrap().addDeviceIdToDeviceList();
      }

      this.store.setOwnDeviceList(deviceList);
   }

   public storeDeviceList(identifier: string, deviceList: number[]) {
      this.store.setDeviceList(identifier, deviceList);
   }

   public prepare(): Promise<void> {
      return this.getBootstrap().prepare();
   }

   public encrypt(contact: Contact, message: Message, xmlElement: Strophe.Builder) {
      let peer = this.getPeer(contact.getJid());

      return peer.encrypt(message.getPlaintextMessage()).then((encryptedMessages) => {
         let stanza = Stanza.buildEncryptedStanza(encryptedMessages, this.store.getDeviceId());

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
         //@TODO abort and don't send message. This should be handled inside the pipe.
         message.setErrorMessage(msg);
         message.setEncrypted(false);

         return [message, xmlElement];
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

      let ownDeviceId = this.store.getDeviceId();
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
         this.peers[jid.bare] = new Peer(jid, this.store);
      }

      return this.peers[jid.bare];
   }

   private getBootstrap(): Bootstrap {
      if (!this.bootstrap) {
         this.bootstrap = new Bootstrap(this.store, this.connection);
      }

      return this.bootstrap;
   }
}
