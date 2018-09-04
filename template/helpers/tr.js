var Handlebars = require('handlebars-runtime');
var Translation = require('../../src/util/Translation').default;

module.exports = function(context, options) {
   var opts = i18next.functions.extend(options.hash, context);

   if (options.fn)
      opts.defaultValue = options.fn(context);

   var result = Translation.t(opts.key, opts);

   return new Handlebars.SafeString(result);
};
