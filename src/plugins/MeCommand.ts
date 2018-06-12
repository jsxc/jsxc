import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Contact from '../Contact'
import Message from '../Message'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class MeCommandPlugin extends AbstractPlugin {
   public static getName(): string {
      return 'meCommand';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor, 80);
   }

   private afterReceiveMessageProcessor = (contact: Contact, message: Message, stanza: Element) => {
      let plaintext = message.getPlaintextMessage();
      let meRegex = /^\/me /;

      if (meRegex.test(plaintext)) {
         plaintext = plaintext.replace(meRegex, contact.getName() + ' ');
         message.setPlaintextMessage(plaintext);
      }

      return Promise.resolve([contact, message, stanza]);
   }
}
