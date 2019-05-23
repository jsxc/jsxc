import ArrayBufferUtils from './ArrayBuffer'
import { $build } from '../../../vendor/Strophe'
import EncryptedDeviceMessage from '../model/EncryptedDeviceMessage';

export default class Stanza {
   public static buildEncryptedStanza(message, ownDeviceId: number) {
      let encryptedElement = $build('encrypted', {
         xmlns: 'eu.siacs.conversations.axolotl'
      });

      encryptedElement.c('header', {
         sid: ownDeviceId
      });

      for (let key of <EncryptedDeviceMessage[]> message.keys) {
         let attrs = {
            rid: key.getDeviceId(),
            prekey: undefined
         };

         if (key.isPreKey()) {
            attrs.prekey = true;
         }

         encryptedElement.c('key', attrs).t(btoa(key.getCiphertext().body)).up();
      }

      encryptedElement.c('iv', ArrayBufferUtils.toBase64(message.iv)).up().up();

      encryptedElement.c('payload').t(ArrayBufferUtils.toBase64(message.payload));

      return encryptedElement;
   }

   public static parseEncryptedStanza(encryptedElement) {
      encryptedElement = $(encryptedElement);
      let headerElement = encryptedElement.find('>header');
      let payloadElement = encryptedElement.find('>payload');

      if (headerElement.length === 0) {
         return false;
      }

      let sourceDeviceId = headerElement.attr('sid');
      let iv = ArrayBufferUtils.fromBase64(headerElement.find('>iv').text());
      let payload = ArrayBufferUtils.fromBase64(payloadElement.text());

      let keys = headerElement.find('key').get().map(function(keyElement) {
         return {
            preKey: $(keyElement).attr('prekey') === 'true',
            ciphertext: atob($(keyElement).text()),
            deviceId: parseInt($(keyElement).attr('rid'), 10)
         };
      }); //@REVIEW maybe index would be better

      return {
         sourceDeviceId,
         keys,
         iv,
         payload
      };
   }
}
