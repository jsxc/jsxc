/* jshint node: true */
var Handlebars = require('handlebars-runtime');
var Translation = require('../../src/util/Translation').default;

module.exports = function(i18n_key) {
   var result = Translation.t(i18n_key);

   return new Handlebars.SafeString(result || i18n_key);
};
