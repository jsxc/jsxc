import * as sha1 from 'js-sha1';
import Utils from './Utils';

export default class Hash {
   public static String(value: string) {
      let hash = 0;

      if (value.length === 0) {
         return hash;
      }

      for (let i = 0; i < value.length; i++) {
         hash = (hash << 5) - hash + value.charCodeAt(i);
         hash |= 0; // Convert to 32bit integer
      }

      return hash;
   }

   public static SHA1FromBase64(data: string): string {
      let base64 = data.replace(/^.+;base64,/, '');
      let buffer = Utils.base64ToArrayBuffer(base64);

      return sha1(buffer);
   }
}
