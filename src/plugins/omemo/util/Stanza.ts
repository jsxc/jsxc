import ArrayBufferUtils from './ArrayBuffer'

export default class Stanza {
   public static buildEncryptedStanza(message, ownDeviceId: number) {
      let encryptedElement = $build('encrypted', {
         xmlns: 'eu.siacs.conversations.axolotl'
      });

      encryptedElement.c('header', {
         sid: ownDeviceId
      });

      for (let key of message.keys) {
         let attrs = {
            rid: key.deviceId,
            prekey: undefined
         };

         if (key.preKey) {
            attrs.prekey = true;
         }

         encryptedElement.c('key', attrs).t(btoa(key.ciphertext.body)).up();
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
            deviceId: parseInt($(keyElement).attr('rid'))
         };
      }); //@REVIEW maybe index would be better

      return {
         sourceDeviceId: sourceDeviceId,
         keys: keys,
         iv: iv,
         payload: payload
      };
   }
}
