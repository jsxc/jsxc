import Contact from '../../Contact'
import Client from '../../Client'
import * as CONST from '../../CONST'
import Message from '../../Message'
import { AbstractPlugin } from '../../plugin/AbstractPlugin'
import PluginAPI from '../../plugin/PluginAPI'
import Translation from '../../util/Translation'
import Log from '../../util/Log'
import PersistentMap from '../../util/PersistentMap'
import JID from '../../JID'
import * as Namespace from '../../connection/xmpp/namespace'
import Attachment from '../../Attachment'
import HttpUploadService from './HttpUploadService'
import { IConnection } from '../../connection/Connection.interface'
import Pipe from '../../util/Pipe'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class HttpUploadPlugin extends AbstractPlugin {
   public static getName(): string {
      return 'httpUpload';
   }

   private services: HttpUploadService[];

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('HTTPUPLOAD', 'urn:xmpp:http:upload');

      pluginAPI.addPreSendMessageProcessor(this.preSendMessageProcessor, 20);

      let preSendMessageStanzaPipe = Pipe.get('preSendMessageStanza');
      preSendMessageStanzaPipe.addProcessor(this.addBitsOfBinary);

      let connection = pluginAPI.getConnection();

      connection.registerHandler(this.onBitsOfBinary, 'urn:xmpp:bob', 'iq');
   }

   private preSendMessageProcessor = (contact: Contact, message: Message) => {
      if (!message.hasAttachment()) {
         return Promise.resolve([contact, message]);
      }

      let attachment = message.getAttachment();

      return this.getServices().then((services) => {
         for (let service of services) {
            if (service.isSuitable(attachment)) {
               return service;
            }
         }

         throw 'Found no suitable http upload service';
      }).then((service) => {
         return service.sendFile(attachment.getFile());
      }).then((downloadUrl) => {
         this.addUrlToMessage(downloadUrl, attachment, message);
         attachment.setData(downloadUrl);
         attachment.setProcessed(true);
      }).catch((err) => {
         Log.debug(err);
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

      return connection.getDiscoItems(serverJid).then((stanza) => {
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
                        maxFileSize = parseInt(values[0]);
                     }
                  }

                  return new HttpUploadService(this.pluginAPI, jid, maxFileSize);
               }
            });

            promises.push(promise);
         });

         return Promise.all(promises).then((results) => {
            console.log('Promise all', results)
            return results.filter(service => typeof service !== 'undefined');
         });
      });
   }

   private getConnection(): IConnection {
      return this.pluginAPI.getConnection();
   }

   private addUrlToMessage(downloadUrl: string, attachment: Attachment, message: Message) {
      let plaintext = message.getPlaintextMessage();

      message.setPlaintextMessage(downloadUrl + ' ' + plaintext);

      let html = $('<div>').append(message.getHtmlMessage());

      let linkElement = $('<a>');
      linkElement.attr('href', downloadUrl);

      let imageElement = $('<img>');
      imageElement.attr('src', 'cid:' + attachment.getUid());
      imageElement.attr('alt', attachment.getName());

      linkElement.append(imageElement);

      html.append($('<p>').append(linkElement));
      //@TODO html !== empty ???
      html.append($('<p>').text(plaintext));

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
            id: id,
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

   private addBitsOfBinary = (message: Message, xmlStanza: Strophe.Builder) => {
      //@TODO check if element with cid exists

      if (message.hasAttachment() && message.getAttachment().hasThumbnailData()) {
         let attachment = message.getAttachment();

         xmlStanza.c('data', {
            xmlns: 'urn:xmpp:bob',
            cid: attachment.getUid(),
            type: attachment.getMimeType()
         }).t(attachment.getThumbnailData().replace(/^[^,],+/, '')).up();
      }

      return [message, xmlStanza]
   }
}
