/* jshint node: true */
var Handlebars = require('handlebars-runtime');

module.exports = function(text) {
   text = Handlebars.Utils.escapeExpression(text);
   text = text.replace(/(\r\n|\n|\r)/gm, '<br />');

   return new Handlebars.SafeString(text);
};
