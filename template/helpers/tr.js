// import * as Handlebars from 'handlebars-runtime';
//import * as i18next from 'i18next';
var Handlebars = require('handlebars-runtime');
var i18next = require('i18next');
var en = require('../../locales/en.json');
var de = require('../../locales/de.json');

i18next.init({
  lng: 'de',
  resources: {
    en: en,
    de: de
  }
});

module.exports = function(context, options) {
   var opts = i18next.functions.extend(options.hash, context);
   if (options.fn)
      opts.defaultValue = options.fn(context);

   var result = i18next.t(opts.key, opts);

   return new Handlebars.SafeString(result);
};
