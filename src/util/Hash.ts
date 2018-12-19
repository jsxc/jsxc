
export default class Hash {
   public static String(value: string) {
      let hash = 0;

      if (value.length === 0) {
         return hash;
      }

      for (let i = 0; i < value.length; i++) {
         hash = ((hash << 5) - hash) + value.charCodeAt(i);
         hash |= 0; // Convert to 32bit integer
      }

      return hash;
   }
}
