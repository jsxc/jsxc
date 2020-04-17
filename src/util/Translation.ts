import i18next from 'i18next'
import Log from '@util/Log';
import Client from '@src/Client';
import LanguageDetector from 'i18next-browser-languagedetector'

let resources = __LANGS__.reduce((resources, lang) => {
   resources[lang] = require(`../../locales/${lang}.json`);

   return resources;
}, {});

export default class Translation {
   private static initialized = false;

   public static initialize() {
      if (Client.getOption('autoLang')) {
         i18next.use(LanguageDetector);
      }

      i18next.init({
         debug: Client.isDebugMode(),
         lng: Client.getOption('lang'),
         fallbackLng: 'en',
         returnNull: false,
         resources,
         interpolation: {
            prefix: '__',
            suffix: '__'
         },
         saveMissing: true,
         detection: {
            order: ['querystring', 'navigator', 'htmlTag', 'path', 'subdomain'],
         },
      });

      i18next.on('missingKey', function(language, namespace, key, res) {
         Log.info(`[i18n] Translation of "${key}" is missing for language "${language}". Namespace: ${namespace}. Resource: ${res}.`);
      });

      Translation.initialized = true;
   }

   public static t(text: string, param?): string {
      if (!Translation.initialized) {
         Log.warn('Translator not initialized');

         return text;
      }

      let translatedString = i18next.t(text, param);

      return translatedString;
   }

   public static getCurrentLanguage() {
      return i18next.language;
   }
}
