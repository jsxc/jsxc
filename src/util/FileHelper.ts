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
}
