export default class Utils {
   public static removeHTML(text: string): string {
      return $('<span>').html(text).text();
   }

   public static escapeHTML(text: string): string {
      text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   }

   public static decodeEntities(str: string) {

      if(str && typeof str === 'string') {
        // strip script/html tags
        let element = document.createElement('div');
        str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
        element.innerHTML = str;
        str = element.textContent;
        element.textContent = '';
      }
  
      return str;
   };

   public static diffArray(newArray: any[], oldArray: any[]): { newValues: any[]; deletedValues: any[] } {
      newArray = newArray || [];
      oldArray = oldArray || [];

      return {
         newValues: newArray.filter(id => oldArray.indexOf(id) < 0),
         deletedValues: oldArray.filter(id => newArray.indexOf(id) < 0),
      };
   }

   public static isObject(candidate: any) {
      return !!candidate && candidate.constructor === Object;
   }

   public static mergeDeep(target: Object, ...sources: Object[]): Object {
      if (!sources.length) {
         return target;
      }
      if (!Utils.isObject(target)) {
         throw new Error('Target has to be an object');
      }
      const source = sources.shift();

      if (Utils.isObject(source)) {
         for (const key in source) {
            if (Utils.isObject(source[key])) {
               if (!target[key]) {
                  Object.assign(target, { [key]: {} });
               }

               Utils.mergeDeep(target[key], source[key]);
            } else {
               Object.assign(target, { [key]: source[key] });
            }
         }
      }

      return Utils.mergeDeep(target, ...sources);
   }

   public static prettifyHex(hex: string) {
      return hex.replace(/(.{8})/g, '$1 ').replace(/ $/, '');
   }

   public static base64ToArrayBuffer(base64String: string) {
      let binaryString = window.atob(base64String);
      let bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
         bytes[i] = binaryString.charCodeAt(i);
      }

      return bytes.buffer;
   }
}
