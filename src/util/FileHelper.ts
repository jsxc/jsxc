import Utils from "./Utils";

export default class FileHelper {
   public static getDataURLFromFile(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
         let reader = new FileReader();

         reader.onload = function () {
            resolve(<string>reader.result);
         };

         reader.onerror = reject;

         reader.readAsDataURL(file);
      });
   }

   public static getFileSizeFromBase64(data: string): number {
      let base64 = data.replace(/^.+;base64,/, '');
      let buffer = Utils.base64ToArrayBuffer(base64);

      return buffer.byteLength;
   }
}
