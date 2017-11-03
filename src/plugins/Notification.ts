import Client from '../Client'
import Options from '../Options'
import * as CONST from '../CONST'
import Message from '../Message'
import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Pipe from '../util/Pipe'
import Contact from '../Contact'
import Translation from '../util/Translation'
import Notification from '../Notification'
import { SOUNDS } from '../CONST'
import * as Namespace from '../connection/xmpp/namespace'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class NotificationPlugin extends AbstractPlugin {

   public static getName(): string {
      return 'notification';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let pipe = Pipe.get('afterReceiveMessage');
      pipe.addProcessor(this.afterReceiveMessageProcessor, 90);
   }

   private afterReceiveMessageProcessor = (contact: Contact, message: Message) => {
      Notification.notify({
         title: Translation.t('New_message_from'),
         message: message.getProcessedBody(), //@TODO remove or handle HTML
         soundFile: SOUNDS.MSG,
         source: contact
      });

      return [contact, message];
   }
}
