/* jshint node: true */
var Handlebars = require('handlebars-runtime');
var i18next = require('i18next');
var en = require('../../locales/en.json');
var de = require('../../locales/de.json');

i18next.init({
   lng: 'de',
   resources: {
      en: en,
      de: de
   },
   interpolation: {
      prefix: '__',
      suffix: '__'
   }
});

module.exports = function(i18n_key) {
   var result = i18next.t(i18n_key);

   return new Handlebars.SafeString(result || i18n_key);
};
