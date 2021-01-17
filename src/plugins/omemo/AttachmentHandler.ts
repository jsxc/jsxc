import Attachment from '@src/Attachment';
import Client from '@src/Client';
import Log from '@util/Log';
import ArrayBufferUtils from './util/ArrayBuffer';

class AttachmentHandler {
   private objectUrlCache: { [url: string]: string } = {};

   public getId() {
      return 'omemo';
   }

   public handler = async (attachment: Attachment, active: boolean): Promise<void> => {
      let data = attachment.getData();

      if (!data || !data.startsWith('aesgcm://')) {
         return;
      }

      if (this.objectUrlCache[data]) {
         if (active) {
            this.openPage(this.objectUrlCache[data]);
         }

         return;
      }

      let aesUrl: URL;

      try {
         aesUrl = new URL(data);
      } catch (err) {
         return;
      }

      let ivKey = aesUrl.hash.replace(/^#/, '');

      let httpUrl = new URL(aesUrl.toString());
      httpUrl.hash = '';
      httpUrl.protocol = window.location.hostname === 'localhost' ? 'http:' : 'https:';

      if (!active && !Client.isTrustedDomain(httpUrl)) {
         return;
      }

      let content = await this.downloadFile(httpUrl.toString());
      let plaintext: ArrayBuffer;
      try {
         plaintext = await this.decryptContent(ivKey, content);
      } catch (err) {
         Log.warn('Could not decrypt file', err);

         return;
      }

      let decryptedFile = new File([plaintext], attachment.getName(), {
         type: attachment.getMimeType(),
      });

      let dataUrl = URL.createObjectURL(decryptedFile);

      this.objectUrlCache[data] = dataUrl;

      if (active) {
         this.openPage(dataUrl);
      }

      if (!attachment.hasThumbnailData()) {
         attachment.setFile(decryptedFile);
         attachment.generateThumbnail(true);
      }
   }

   private downloadFile(url: string) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
         $.ajax({
            method: 'GET',
            url,
            xhrFields: {
               responseType: 'arraybuffer',
            },
            success: (data) => {
               resolve(data);
            },
            error: (jqXHR) => {
               Log.warn('error while downloading file from ' + url);

               reject(new Error(jqXHR && jqXHR.readyState === 0 ? 'Download was probably blocked by your browser' : 'Could not download file'));
            }
         });
      })
   }

   private async decryptContent(ivKey: string, ciphertext: ArrayBuffer) {
      let iv = ArrayBufferUtils.fromHex(ivKey.slice(0, 24));
      let keyData = ArrayBufferUtils.fromHex(ivKey.slice(24));
      let key = await crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['decrypt']);

      let decrypted = await crypto.subtle.decrypt({
         name: 'AES-GCM',
         iv
      }, key, ciphertext);

      return decrypted;
   }

   private openPage(href: string) {
      let link = $('<a>');
      link.attr('href', href);
      link.attr('target', 'blank');
      link.get(0).click();
   }
}

const attachmentHandler = new AttachmentHandler();

export default attachmentHandler;
