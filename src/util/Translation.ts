import i18next from 'i18next'
import Log from '@util/Log';

export default class Translation {
   public static t(text: string, param?): string {
      let translatedString = i18next.t(text, param);

      if (!translatedString || translatedString === text) {
         Log.warn('[i18n] Untranslated:', text);
      }

      return translatedString;
   }
}
