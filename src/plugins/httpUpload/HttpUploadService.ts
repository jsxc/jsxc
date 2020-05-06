import JID from '../../JID'
import * as Namespace from '../../connection/xmpp/namespace'
import { IPluginAPI } from '../../plugin/PluginAPI.interface'
import Attachment from '../../Attachment'
import { $iq } from '../../vendor/Strophe'

const ALLOWED_HEADERS = ['Authorization', 'Cookie', 'Expires'];

export default class HttpUploadService {
   private namespace;

   constructor(private pluginAPI: IPluginAPI, private jid: JID, private maxFileSize: number = 0) {
      this.namespace = Namespace.get('HTTPUPLOAD');
      this.maxFileSize = maxFileSize || 0;
   }

   public getJid(): JID {
      return this.jid;
   }

   public getMaxFileSize(): number {
      return this.maxFileSize;
   }

   public isSuitable(attachment: Attachment): boolean {
      return this.maxFileSize === 0 || attachment.getSize() <= this.maxFileSize;
   }

   public async sendFile(file: File, progress?: (loaded, total) => void): Promise<string> {
      let urls = await this.requestSlot(file)

      await this.uploadFile(file, urls.put, urls.putHeaders, progress);

      if ((<any> file).aesgcm) {
         return urls.get.replace(/^https?:/, 'aesgcm:') + '#' + (<any> file).aesgcm;
      }

      return urls.get;
   }

   private requestSlot(file: File) {
      let iq = $iq({
         to: this.jid.full,
         type: 'get'
      }).c('request', {
         'xmlns': this.namespace,
         'filename': file.name,
         'size': file.size,
         'content-type': file.type,
      });

      return this.pluginAPI.sendIQ(iq)
         .then(this.parseSlotResponse)
         .catch(this.parseSlotError);
   }

   private parseSlotResponse = (stanza) => {
      let slot = $(stanza).find(`slot[xmlns="${this.namespace}"]`);

      if (slot.length > 0) {
         let put = slot.find('put').attr('url');
         let get = slot.find('get').attr('url');

         let putHeaders = {};

         slot.find('put').find('header').map((index, header) => {
            return {
               name: $(header).attr('name').replace(/\n/g, ''),
               value: $(header).text().replace(/\n/g, ''),
            }
         }).get().filter(header => ALLOWED_HEADERS.indexOf(header.name) > -1).forEach(header => putHeaders[header.name] = header.value);

         return Promise.resolve({
            put,
            get,
            putHeaders,
         });
      }

      return this.parseSlotError(stanza);
   }

   private parseSlotError = (stanza) => {
      let error = {
         type: $(stanza).find('error').attr('type') || 'unknown',
         text: $(stanza).find('error text').text() || 'response does not contain a slot element',
         reason: null
      };

      if ($(stanza).find('error not-acceptable')) {
         error.reason = 'not-acceptable';
      } else if ($(stanza).find('error resource-constraint')) {
         error.reason = 'resource-constraint';
      } else if ($(stanza).find('error not-allowed')) {
         error.reason = 'not-allowed';
      } else if ($(stanza).find('error forbidden')) {
         error.reason = 'forbidden';
      }

      return Promise.reject(error);
   }

   private uploadFile = (file: File, putUrl, headers, progress?: (loaded, total) => void) => {
      return new Promise((resolve, reject) => {
         $.ajax({
            url: putUrl,
            type: 'PUT',
            contentType: file.type,
            data: file,
            processData: false,
            headers,
            xhr() {
               let xhr = (<any> $).ajaxSettings.xhr();

               // track upload progress
               xhr.upload.onprogress = function(ev) {
                  if (ev.lengthComputable && typeof progress === 'function') {
                     progress(ev.loaded, ev.total);
                  }
               };

               return xhr;
            },
            success: () => {
               this.pluginAPI.Log.debug('file successful uploaded');

               resolve();
            },
            error: (jqXHR) => {
               this.pluginAPI.Log.warn('error while uploading file to ' + putUrl);

               reject(new Error(jqXHR && jqXHR.readyState === 0 ? 'Upload was probably blocked by your browser' : 'Could not upload file'));
            }
         });
      });
   }
}
