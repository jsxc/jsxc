import Message from '../Message'
import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Pipe from '../util/Pipe'
import Contact from '../Contact'
import Translation from '../util/Translation'
import Notification from '../Notification'
import { Presence } from '../connection/AbstractConnection'
import { SOUNDS } from '../CONST'

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

      pluginAPI.registerPresenceHook(this.onPresence);
   }

   private afterReceiveMessageProcessor = (contact: Contact, message: Message) => {
      Notification.notify({
         title: Translation.t('New_message_from'),
         message: message.getPlaintextMessage(),
         soundFile: SOUNDS.MSG,
         source: contact
      });

      return [contact, message];
   }

   private onPresence = (contact: Contact, newPresence, oldPresence) => {
      if (oldPresence !== Presence.offline || newPresence === Presence.offline) {
         return;
      }

      let now = new Date();
      let created = this.pluginAPI.getConnectionCreationDate() || now;

      if (!created || (now.valueOf() - created.valueOf()) < 2 * 60 * 1000) {
         return;
      }

      Notification.notify({
         title: contact.getName(),
         message: Translation.t('has_come_online'),
         source: contact
      });
   }
}
