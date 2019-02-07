import i18next from 'i18next'
import Log from '@util/Log';
import Client from '@src/Client';

let en = require('../../locales/en.json');
let de = require('../../locales/de.json');

function detectLanguage() {
   let lang;

   // if (storage.getItem('lang') !== null) {
   //    lang = storage.getItem('lang');
   // } else
   if (navigator.languages && navigator.languages.length > 0) {
      lang = navigator.languages[0];
   } else if (navigator.language) {
      lang = navigator.language;
   } else {
      lang = Client.getOption('defaultLang');
   }

   return lang;
}

i18next.init({
   lng: detectLanguage(),
   fallbackLng: 'en',
   returnNull: false,
   resources: {
      en,
      de
   },
   interpolation: {
      prefix: '__',
      suffix: '__'
   }
});

i18next.on('missingKey', function(language, namespace, key, res) {
   Log.info(`[i18n] Translation of "${key}" is missing for language "${language}". Namespace: ${namespace}. Resource: ${res}.`);
});

export default class Translation {
   public static t(text: string, param?): string {
      let translatedString = i18next.t(text, param);

      return translatedString;
   }
}
