import { API as PluginAPI } from '../../plugin/PluginAPI.interface'
import { EncryptionPlugin } from '../../plugin/EncryptionPlugin'
import { EncryptionState } from '../../plugin/AbstractPlugin'
import { DIRECTION, IMessage } from '../../Message.interface'
import { IContact } from '../../Contact.interface'
import Omemo from './lib/Omemo'
import { NS_BASE, NS_DEVICELIST } from './util/Const'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class OMEMOPlugin extends EncryptionPlugin {
   private sessions = {};
   private omemo: Omemo;

   public static getName(): string {
      return 'omemo';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      if (!this.isLibSignalAvailable()) {
         throw 'LibSignal is not available'
      }

      pluginAPI.getConnection().getPEPService().subscribe(NS_DEVICELIST, this.onDeviceListUpdate);

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);
   }

   public toggleTransfer(contact: IContact): Promise<void> {
      if (!this.isLibSignalAvailable()) {
         return;
      }

      let storage = this.pluginAPI.getStorage();
      let enabled = !storage.getItem('enabled', contact.getJid().bare);
      storage.setItem('enabled', contact.getJid().bare, enabled);

      if (!enabled) {
         contact.setEncryptionState(EncryptionState.Plaintext, OMEMOPlugin.getName());
         return;
      }

      //@TODO check if contact supports omemo

      return this.getOmemo().prepare().then(() => {
         contact.setEncryptionState(EncryptionState.UnverifiedEncrypted, OMEMOPlugin.getName());
      });
   }

   private onDeviceListUpdate = (stanza) => {
      let messageStanza = $(stanza);
      let itemsElement = messageStanza.find(`items[node="${NS_DEVICELIST}"]`);
      let listElement = messageStanza.find(`list[xmlns="${NS_BASE}"]`);
      let fromString = messageStanza.attr('from');

      if (listElement.length !== 1 || itemsElement.length !== 1) {
         return true;
      }

      if (!fromString) {
         return true;
      }

      let fromJid = this.pluginAPI.createJID(fromString);
      let deviceIds = listElement.find('device').get().map(function(deviceElement) {
         return parseInt($(deviceElement).attr('id'));
      });

      deviceIds = deviceIds.filter(id => typeof id === 'number' && !isNaN(id));

      let ownJid = this.pluginAPI.getConnection().getJID();

      if (ownJid.bare === fromJid.bare) {
         this.getOmemo().storeOwnDeviceList(deviceIds);
      } else {
         this.getOmemo().storeDeviceList(fromJid.bare, deviceIds);
      }

      return true;
   }

   private afterReceiveMessageProcessor = (contact: IContact, message: IMessage, stanza: Element): Promise<{}> => {
      return this.getOmemo().decrypt(stanza).then((decrypted) => {
         if (!decrypted) {
            throw 'No decrypted message found';
         }

         message.setPlaintextMessage(decrypted);
         message.setEncrypted(true);

         return [contact, message, stanza];

      }).catch((msg) => {
         console.warn('OMEMO: ', msg);

         return [contact, message, stanza];
      });
   }

   private preSendMessageStanzaProcessor = (message: IMessage, xmlElement: Strophe.Builder) => {
      let contact = this.pluginAPI.getContact(message.getPeer());

      if (!contact) {
         console.warn('Could not find contact');
         return Promise.resolve([message, xmlElement]);
      }

      let enabled = !!this.pluginAPI.getStorage().getItem('enabled', contact.getJid().bare);

      if (!enabled) {
         return Promise.resolve([message, xmlElement]);
      }

      return this.getOmemo().encrypt(contact, message, xmlElement);
   }

   private getOmemo() {
      if (!this.omemo) {
         this.omemo = new Omemo(this.pluginAPI.getStorage(), this.pluginAPI.getConnection());
      }

      return this.omemo;
   }

   private isLibSignalAvailable() {
      return typeof (<any>window).libsignal !== 'undefined';
   }
}
