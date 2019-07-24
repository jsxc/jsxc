import { IPluginAPI } from '../../plugin/PluginAPI.interface'
import { EncryptionPlugin } from '../../plugin/EncryptionPlugin'
import { EncryptionState } from '../../plugin/AbstractPlugin'
import { IMessage } from '../../Message.interface'
import { IContact, ContactType } from '../../Contact.interface'
import Omemo from './lib/Omemo'
import ChatWindow from '../../ui/ChatWindow'
import { NS_BASE, NS_DEVICELIST } from './util/Const'
import OmemoDevicesDialog from '../../ui/dialogs/omemoDevices'
import { Trust } from './lib/Device';
import Translation from '@util/Translation';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class OMEMOPlugin extends EncryptionPlugin {
   private omemo: Omemo;

   public static getId(): string {
      return 'omemo';
   }

   public static getName(): string {
      return 'OMEMO';
   }

   public static getDescription(): string {
      return Translation.t('setting-omemo-enable');
   }

   constructor(pluginAPI: IPluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      if (!this.isLibSignalAvailable()) {
         throw new Error('LibSignal is not available')
      }

      pluginAPI.getConnection().getPEPService().subscribe(NS_DEVICELIST, this.onDeviceListUpdate);

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow) => {
         if (chatWindow.getContact().getType() !== ContactType.CHAT) {
            return;
         }

         chatWindow.addMenuEntry('omemo-devices', 'OMEMO devices', () => this.openDeviceDialog(chatWindow));
      });
   }

   private openDeviceDialog = (chatWindow) => {
      this.getOmemo().prepare().then(() => {
         let peerContact = chatWindow.getContact();

         OmemoDevicesDialog(peerContact, this.getOmemo());
      });
   }

   public toggleTransfer(contact: IContact): Promise<void> {
      if (!this.isLibSignalAvailable()) {
         return;
      }

      if (contact.getEncryptionPluginName() === OMEMOPlugin.getName()) {
         contact.setEncryptionState(EncryptionState.Plaintext, OMEMOPlugin.getName());
         return;
      }

      return this.getOmemo().prepare().then(() => {
         if (!this.getOmemo().isSupported(contact)) {
            throw new Error(Translation.t('Your_contact_does_not_support_OMEMO'));
         }

         if (!this.getOmemo().isTrusted(contact) && !this.getOmemo().trustOnFirstUse(contact)) {
            throw new Error(Translation.t('There_are_new_OMEMO_devices'));
         }

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
         return parseInt($(deviceElement).attr('id'), 10);
      });

      deviceIds = deviceIds.filter(id => typeof id === 'number' && !isNaN(id));

      this.getOmemo().storeDeviceList(fromJid.bare, deviceIds);

      return true;
   }

   private afterReceiveMessageProcessor = (contact: IContact, message: IMessage, stanza: Element): Promise<{}> => {
      if ($(stanza).find(`>encrypted[xmlns="${NS_BASE}"]`).length === 0) {
         return Promise.resolve([contact, message, stanza]);
      }

      return this.getOmemo().decrypt(stanza).then((decrypted) => {
         if (!decrypted || !decrypted.plaintext) {
            throw new Error('No decrypted message found');
         }

         if (decrypted.trust !== Trust.recognized && decrypted.trust !== Trust.confirmed) {
            message.setErrorMessage(Translation.t('Message_received_from_unknown_OMEMO_device'));
         }

         message.setPlaintextMessage(decrypted.plaintext);
         message.setEncrypted(true);

         return [contact, message, stanza];

      }).catch((msg) => {
         this.pluginAPI.Log.warn(msg);

         return [contact, message, stanza];
      });
   }

   private preSendMessageStanzaProcessor = (message: IMessage, xmlElement: Strophe.Builder) => {
      let contact = this.pluginAPI.getContact(message.getPeer());

      if (!contact) {
         return Promise.resolve([message, xmlElement]);
      }

      if (contact.getEncryptionPluginName() !== OMEMOPlugin.getName()) {
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
      return typeof (<any> window).libsignal !== 'undefined';
   }
}
