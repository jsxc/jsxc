import Contact from '../../Contact'
import Message from '../../Message'
import { AbstractPlugin, IMetaData } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import JID from '../../JID'
import * as Namespace from '../../connection/xmpp/namespace'
import Attachment from '../../Attachment'
import HttpUploadService from './HttpUploadService'
import { IConnection } from '../../connection/Connection.interface'
import { $iq } from '../../vendor/Strophe'
import Translation from '../../util/Translation';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class HttpUploadPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'http-upload';
   }

   public static getName(): string {
      return 'HTTP File Upload';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-http-upload-enable'),
         xeps: [{
            id: 'XEP-0363',
            name: 'HTTP File Upload',
            version: '1.0.0',
         }]
      }
   }

   private services: HttpUploadService[];

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('HTTPUPLOAD', 'urn:xmpp:http:upload:0');

      pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor, 20);

      pluginAPI.addPreSendMessageStanzaProcessor(this.addBitsOfBinary);

      pluginAPI.addAfterReceiveMessageProcessor(this.extractAttachmentFromStanza);
      pluginAPI.addAfterReceiveGroupMessageProcessor(this.extractAttachmentFromStanza);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onBitsOfBinary, 'urn:xmpp:bob', 'iq');
   }

   private preSendMessageProcessor = (contact: Contact, message: Message): Promise<[Contact, Message]> => {
      if (!message.hasAttachment()) {
         return Promise.resolve([contact, message]);
      }

      let attachment = message.getAttachment();

      return this.getServices().then((services) => {
         for (let service of services) {
            if (service.isSuitable(attachment)) {
               return service;
            }

            this.pluginAPI.Log.debug(`${service.getJid()} only supports files up to ${service.getMaxFileSize()} bytes`);
         }

         throw new Error('Found no suitable http upload service. File probably too large.');
      }).then((service) => {
         return service.sendFile(attachment.getFile(), (transferred, total) => {
            message.updateProgress(transferred, total);
         });
      }).then((downloadUrl) => {
         this.addUrlToMessage(downloadUrl, attachment, message);
         attachment.setProcessed(true);

         if (!attachment.setData(downloadUrl)) {
            message.setErrorMessage(Translation.t('Attachment_too_large_to_store'));
         }
      }).catch((err) => {
         this.pluginAPI.Log.debug(err);

         if (err) {
            setTimeout(() => {
               contact.addSystemMessage(err.toString());
            }, 500);
         }
      }).then(() => {
         return [contact, message];
      });
   }

   private getServices(): Promise<HttpUploadService[]> {
      if (this.services) {
         return Promise.resolve(this.services);
      }

      return this.requestServices().then((services) => {
         this.services = services;

         return services;
      });
   }

   private requestServices(): Promise<HttpUploadService[]> {
      let connection = this.getConnection();
      let ownJid = connection.getJID();
      let serverJid = new JID('', ownJid.domain, '');
      let discoInfoRepository = this.pluginAPI.getDiscoInfoRepository();

      return connection.getDiscoService().getDiscoItems(serverJid).then((stanza) => {
         let promises = [];

         $(stanza).find('item').each((index, element) => {
            let jid = new JID('', $(element).attr('jid'), '');

            //@TODO cache
            let promise = discoInfoRepository.requestDiscoInfo(jid).then((discoInfo) => {
               let hasFeature = discoInfo.hasFeature(Namespace.get('HTTPUPLOAD'));

               if (hasFeature) {
                  let maxFileSize = 0;
                  let form = discoInfo.getFormByType(Namespace.get('HTTPUPLOAD'));

                  if (form) {
                     let values = form.getValues('max-file-size') || [];
                     if (values.length === 1) {
                        maxFileSize = parseInt(values[0], 10);
                     }
                  }

                  return new HttpUploadService(this.pluginAPI, jid, maxFileSize);
               }
            });

            promises.push(promise);
         });

         return Promise.all(promises).then((results) => {
            return results.filter(service => typeof service !== 'undefined');
         });
      });
   }

   private getConnection(): IConnection {
      return this.pluginAPI.getConnection();
   }

   private addUrlToMessage(downloadUrl: string, attachment: Attachment, message: Message) {
      let plaintext = message.getPlaintextMessage();

      message.setPlaintextMessage(downloadUrl + '\n' + plaintext);

      let html = $('<div>').append(message.getHtmlMessage());

      let linkElement = $('<a>');
      linkElement.attr('href', downloadUrl);

      let imageElement = $('<img>');
      imageElement.attr('src', 'cid:' + attachment.getUid());
      imageElement.attr('alt', attachment.getName());

      linkElement.append(imageElement);

      html.append($('<p>').append(linkElement));
      //@TODO html !== empty ???
      if (plaintext) {
         html.append($('<p>').text(plaintext));
      }

      message.setHtmlMessage(html.html());
   }

   private onBitsOfBinary = (stanza: string): boolean => {
      let stanzaElement = $(stanza);
      let from = new JID(stanzaElement.attr('from'));
      let type = stanzaElement.attr('type');
      let id = stanzaElement.attr('id');
      let cid = stanzaElement.find('data[xmlns="urn:xmpp:bob"]').attr('cid');

      if (type !== 'get') {
         return true;
      }

      let attachment = new Attachment(cid); //@REVIEW security

      if (attachment.hasThumbnailData()) {
         let iq = $iq({
            to: from.full,
            id,
            type: 'result'
         }).c('data', {
            xmlns: 'urn:xmpp:bob',
            cid: attachment.getUid(),
            type: attachment.getMimeType()
         }).t(attachment.getThumbnailData().replace(/^[^,],+/, ''));

         this.pluginAPI.sendIQ(iq);
      }

      return true;
   }

   private addBitsOfBinary = (message: Message, xmlStanza: Strophe.Builder): Promise<any> => {
      //@TODO check if element with cid exists

      if (message.hasAttachment() && message.getAttachment().hasThumbnailData()) {
         let attachment = message.getAttachment();
         let thumbnailData = attachment.getThumbnailData();

         xmlStanza.c('data', {
            xmlns: 'urn:xmpp:bob',
            cid: attachment.getUid(),
            type: thumbnailData.match(/data:(\w+\/[\w-+\d.]+)(?=;|,)/)[1],
         }).t(thumbnailData.replace(/^[^,],+/, '')).up();
      }

      return Promise.resolve([message, xmlStanza]);
   }

   private extractAttachmentFromStanza = (contact: IContact, message: IMessage, stanza: Element): Promise<[IContact, IMessage, Element]> => {
      let element = $(stanza);
      let bodyElement = element.find('html body[xmlns="' + Strophe.NS.XHTML + '"]').first();
      let dataElement = element.find('data[xmlns="urn:xmpp:bob"]');

      if (bodyElement.length && dataElement.length === 1 && !message.isEncrypted()) {
         let cid = dataElement.attr('cid');
         let mimeType = dataElement.attr('type');

         if (!/^[a-z]+\/[a-z0-9.\-+]+$/.test(mimeType)) {
            return Promise.resolve([contact, message, stanza]);
         }

         let linkElement = bodyElement.find('a');
         let imageElement = linkElement.find('img[src^="cid:"]');

         if (imageElement.length === 1 && ('cid:' + cid) === imageElement.attr('src')) {
            let url = linkElement.attr('href');
            let name = imageElement.attr('alt');
            let thumbnailData = dataElement.text();

            if (/^data:image\/(jpeg|jpg|gif|png|svg);base64,[/+=a-z0-9]+$/i.test(thumbnailData) && /^https?:\/\//.test(url)) {
               let attachment = new Attachment(name, mimeType, url);
               attachment.setThumbnailData(thumbnailData);
               attachment.setData(url);

               message.setAttachment(attachment);
               message.setPlaintextMessage(bodyElement.text());
            }
         }
      }

      return Promise.resolve([contact, message, stanza]);
   };
}
