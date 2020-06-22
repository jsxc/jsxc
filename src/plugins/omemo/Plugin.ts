import { IPluginAPI } from '../../plugin/PluginAPI.interface'
import { EncryptionPlugin } from '../../plugin/EncryptionPlugin'
import { EncryptionState, IMetaData } from '../../plugin/AbstractPlugin'
import { IMessage } from '../../Message.interface'
import { IContact, ContactType } from '../../Contact.interface'
import Omemo from './lib/Omemo'
import ChatWindow from '../../ui/ChatWindow'
import { NS_BASE, NS_DEVICELIST } from './util/Const'
import OmemoDevicesDialog from '../../ui/dialogs/omemoDevices'
import { Trust } from './lib/Device';
import Translation from '@util/Translation';
import ArrayBufferUtils from './util/ArrayBuffer'
import Attachment from '@src/Attachment'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class OMEMOPlugin extends EncryptionPlugin {
   private omemo: Omemo;

   public static getId(): string {
      return 'omemo';
   }

   public static getName(): string {
      return 'OMEMO';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-omemo-enable'),
         xeps: [{
            id: 'XEP-0384',
            name: 'OMEMO Encryption',
            version: '0.3.0',
         }]
      }
   }

   public static updateEncryptionState(contact: IContact, trust: Trust) {
      let state = trust === Trust.confirmed ? EncryptionState.VerifiedEncrypted : EncryptionState.UnverifiedEncrypted;

      contact.setEncryptionState(state, OMEMOPlugin.getId());
   }

   constructor(pluginAPI: IPluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      if (!this.isLibSignalAvailable()) {
         throw new Error('LibSignal is not available')
      }

      pluginAPI.getConnection().getPEPService().subscribe(NS_DEVICELIST, this.onDeviceListUpdate);

      pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor, 10);

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor, 90);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor);

      pluginAPI.registerChatWindowInitializedHook((chatWindow: ChatWindow) => {
         if (chatWindow.getContact().getType() !== ContactType.CHAT) {
            return;
         }

         chatWindow.addMenuEntry('omemo-devices', 'OMEMO devices', () => this.openDeviceDialog(chatWindow));
      });
   }

   private openDeviceDialog = async (chatWindow: ChatWindow) => {
      await this.getOmemo().prepare();

      let peerContact = chatWindow.getContact();

      return OmemoDevicesDialog(peerContact, this.getOmemo());
   }

   public toggleTransfer(contact: IContact): Promise<void> {
      if (!this.isLibSignalAvailable()) {
         return;
      }

      if (contact.getEncryptionPluginId() === OMEMOPlugin.getId()) {
         contact.setEncryptionState(EncryptionState.Plaintext, OMEMOPlugin.getId());
         return;
      }

      return this.getOmemo().prepare().then(async () => {
         if (!this.getOmemo().isSupported(contact)) {
            throw new Error(Translation.t('Your_contact_does_not_support_OMEMO'));
         }

         if (!this.getOmemo().isTrusted(contact) && !await this.getOmemo().trustOnFirstUse(contact)) {
            throw new Error(Translation.t('There_are_new_OMEMO_devices'));
         }

         let trust = this.getOmemo().getTrust(contact);

         OMEMOPlugin.updateEncryptionState(contact, trust);
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

         if (decrypted.plaintext.indexOf('aesgcm://') === 0) {
            decrypted.plaintext = this.processEncryptedAttachment(decrypted.plaintext, message);
         }

         message.setPlaintextMessage(decrypted.plaintext);
         message.setEncrypted(true);

         return [contact, message, stanza];

      }).catch((msg) => {
         this.pluginAPI.Log.warn(msg);

         return [contact, message, stanza];
      });
   }

   private processEncryptedAttachment(plaintext: string, message: IMessage) {
      let lines = plaintext.split('\n');
      let matches = lines[0].match(/^aesgcm:\/\/([^#]+\/([^\/]+\.([a-z0-9]+)))#([a-z0-9]+)/i);

      if (!matches) {
         return plaintext;
      }

      let [match, , filename, extension] = matches;
      let mime = /^(jpeg|jpg|gif|png|svg)$/.test(extension) ? `image/${extension}` : 'application/octet-stream';
      let attachment = new Attachment(filename, mime, match);
      attachment.setData(match);

      if (lines[1] && lines[1].indexOf('data:') === 0) {
         if (/^data:image\/(jpeg|jpg|gif|png|svg);base64,[/+=a-z0-9]+$/i.test(lines[1])) {
            attachment.setThumbnailData(lines[1]);
         }

         lines[1] = undefined;
      }

      message.setAttachment(attachment);

      return lines.filter(line => line !== undefined).join('\n');
   }

   private preSendMessageProcessor = async (contact, message) => {
      let attachment = message.getAttachment();

      if (!attachment || contact.getEncryptionPluginId() !== OMEMOPlugin.getId() || contact.getEncryptionState() === EncryptionState.Plaintext) {
         return [contact, message];
      }

      let encryptedFile = await this.encryptFile(attachment.getFile());

      attachment.setFile(encryptedFile);

      return [contact, message];
   }

   private async encryptFile(file: File) {
      let iv = crypto.getRandomValues(new Uint8Array(12));
      let key = await crypto.subtle.generateKey({
         name: 'AES-GCM',
         length: 256
      }, true, ['encrypt', 'decrypt'])
      let encrypted = await crypto.subtle.encrypt({
         name: 'AES-GCM',
         iv
      }, key, await file.arrayBuffer());

      let keydata = await window.crypto.subtle.exportKey('raw', <CryptoKey> key)

      let encryptedFile = new File([encrypted], file.name, {
         type: file.type,
         lastModified: file.lastModified,
      });

      (<any> encryptedFile).aesgcm = ArrayBufferUtils.toHex(iv) + ArrayBufferUtils.toHex(keydata);

      return encryptedFile
   }

   private preSendMessageStanzaProcessor = async (message: IMessage, xmlElement: Strophe.Builder) => {
      let contact = this.pluginAPI.getContact(message.getPeer());

      if (!contact) {
         return [message, xmlElement];
      }

      if (contact.getEncryptionPluginId() !== OMEMOPlugin.getId()) {
         return [message, xmlElement];
      }

      let isTrustUnknown = this.getOmemo().isTrustUnknown(contact);

      if (isTrustUnknown) {
         await this.handleNewDevice(contact);
      }

      return this.getOmemo().encrypt(contact, message, xmlElement);
   }

   private handleNewDevice(contact: IContact) {
      let chatWindow = contact.getChatWindow();
      let overlayElement = chatWindow.getOverlay();

      overlayElement.append('<p>' + Translation.t('There_are_new_devices') + '</p>');

      let continueButton = $('<button class="jsxc-button jsxc-button--block jsxc-button--primary" />');
      continueButton.text(Translation.t('Configure'));
      overlayElement.append(continueButton);

      let cancelButton = $('<a href="#" class="jsxc-button jsxc-button--block" />');
      cancelButton.text(Translation.t('Cancel'));
      overlayElement.append(cancelButton);

      chatWindow.showOverlay();

      return new Promise(resolve => {
         continueButton.click(async ev => {
            ev.preventDefault();

            chatWindow.hideOverlay();

            await this.openDeviceDialog(chatWindow);

            resolve();
         })

         cancelButton.click(ev => {
            ev.preventDefault();

            chatWindow.hideOverlay();

            resolve();
         })
      });
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
