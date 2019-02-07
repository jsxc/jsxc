export default class UUID {
   public static v4(): string {
      if (crypto && typeof crypto.getRandomValues === 'function') {
         return UUID.v4withCSPRG();
      } else {
         return UUID.v4withoutCSPRG();
      }
   }

   private static v4withCSPRG(): string {
      return `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, c =>
         (parseInt(c, 10) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c, 10) / 4).toString(16)
      )
   }

   private static v4withoutCSPRG(): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
         let r = Math.random() * 16 | 0;
         let v = c === 'x' ? r : (r & 0x3 | 0x8);
         return v.toString(16);
      });
   }
}
