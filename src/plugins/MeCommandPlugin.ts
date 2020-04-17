import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Contact from '../Contact'
import Translation from '@util/Translation';
import { DIRECTION } from '@src/Message.interface';

/**
 * XEP-0245: The /me Command
 *
 * @version 1.0
 * @see https://xmpp.org/extensions/xep-0245.html
 */

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class MeCommandPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'me-command';
   }

   public static getName(): string {
      return 'The /me Command';
   }

   public static getDescription(): string {
      return Translation.t('setting-meCommand-enable');
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.registerTextFormatter(this.textFormatter);
   }

   private textFormatter = (plaintext: string, direction: DIRECTION, contact: Contact, senderName: string) => {
      let meRegex = /^\/me /;

      if (direction !== DIRECTION.IN) {
         return plaintext.replace(meRegex, `<i>/me</i> `);
      }

      if (!senderName && !contact) {
         return plaintext;
      }

      if (meRegex.test(plaintext)) {
         let name = senderName || contact.getName();

         if (name.indexOf('@') > -1) {
            name = name.slice(0, name.indexOf('@'));
         }

         plaintext = plaintext.replace(meRegex, `<i title="/me">${name}</i> `);
      }

      return plaintext;
   }
}
