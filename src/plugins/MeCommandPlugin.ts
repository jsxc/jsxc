import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Contact from '../Contact'
import Message from '../Message'
import Translation from '@util/Translation';

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

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor, 80);
   }

   private afterReceiveMessageProcessor = (contact: Contact, message: Message, stanza: Element) => {
      let plaintext = message.getPlaintextMessage();
      let meRegex = /^\/me /;

      if (meRegex.test(plaintext)) {
         let name = contact.getName();

         if (name.indexOf('@') > -1) {
            name = name.slice(0, name.indexOf('@'));
         }

         plaintext = plaintext.replace(meRegex, `***${name} `);
         message.setPlaintextMessage(plaintext);
      }

      return Promise.resolve([contact, message, stanza]);
   }
}
