import Log from './Log'

export default class Random {
   public static number(max: number, min: number = 0): number {
      if (crypto && typeof crypto.getRandomValues === 'function') {
         return Random.numberWithCSPRG(max, min);
      } else {
         return Random.numberWithoutCSPRG(max, min);
      }
   }

   private static numberWithCSPRG(max: number, min: number): number {
      const randomBuffer = new Uint32Array(1);

      window.crypto.getRandomValues(randomBuffer);

      let randomNumber = randomBuffer[0] / (0xffffffff + 1);

      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(randomNumber * (max - min + 1)) + min;
   }

   private static numberWithoutCSPRG(max: number, min: number): number {
      Log.warn('Random number is generated without CSPRG');

      return Math.floor(Math.random() * (max - min)) + min;
   }
}
