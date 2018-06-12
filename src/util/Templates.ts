import * as Handlebars from 'handlebars-runtime'
import * as i18next from 'i18next'

export default class Templates {
   private static handlebars = null;

   public static setup() {
      if (this.handlebars !== null)
         return;

      this.handlebars = Handlebars.noConflict();

      this.handlebars.registerHelper('t', function(i18n_key) {
         let result = i18next.t(i18n_key);

         return new Handlebars.SafeString(result);
      });

      this.handlebars.registerHelper('tr', function(context, options) {
         let opts = i18next.functions.extend(options.hash, context);
         if (options.fn)
            opts.defaultValue = options.fn(context);

         let result = i18next.t(opts.key, opts);

         return new Handlebars.SafeString(result);
      });
   }

   public static get(name: string, context: any = {}, options?: any): string {
      Templates.setup();
      console.warn('Deprecated? Template.get');
      // @TODO log or through exception if template does not exist
      return this.handlebars.templates[name](context, options);
   }
}
