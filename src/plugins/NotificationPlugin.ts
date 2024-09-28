import { AbstractPlugin } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '../util/Translation';
import Notification, { NotificationState } from '../Notification';
import { Presence } from '../connection/AbstractConnection';
import { SOUNDS } from '../CONST';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';
import Client from '@src/Client';
import { FUNCTION as NOTICEFUNCTION } from '../Notice';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class NotificationPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'notification';
   }

   public static getName(): string {
      return 'Desktop Notification';
   }

   public static getDescription(): string {
      return Translation.t('setting-notification-enable');
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addAfterReceiveMessageProcessor(this.afterReceiveMessageProcessor, 90);
      pluginAPI.addAfterReceiveGroupMessageProcessor(this.afterReceiveMessageProcessor, 90);

      pluginAPI.registerPresenceHook(this.onPresence);

      pluginAPI.registerConnectionHook;

      pluginAPI.registerConnectionHook((status, condition) => {
         if (status === Strophe.Status.ATTACHED) {
            let state = Client.getStorage().getItem('notificationState');
            state = typeof state === 'number' ? state : NotificationState.ASK;

            if (state === NotificationState.ASK && !Notification.hasPermission()) {
               Client.getNoticeManager().addNotice({
                  title: Translation.t('Notifications') + '?',
                  description: Translation.t('Should_we_notify_you_'),
                  fnName: NOTICEFUNCTION.notificationRequest,
               });
            }
         }
      });
   }

   private afterReceiveMessageProcessor = (
      contact: IContact,
      message: IMessage,
      stanza: Element
   ): Promise<[IContact, IMessage, Element]> => {
      if ((message.getPlaintextMessage() || message.getAttachment()) && message.isIncoming()) {
         Notification.notify({
            title: Translation.t('New_message_from', {
               name: contact.getName(),
            }),
            message: message.getPlaintextMessage(),
            soundFile: SOUNDS.MSG,
            source: contact,
         });
      }

      return Promise.resolve([contact, message, stanza]);
   };

   private onPresence = (contact: IContact, newPresence, oldPresence) => {
      if (oldPresence !== Presence.offline || newPresence === Presence.offline) {
         return;
      }

      let now = new Date();
      let created = this.pluginAPI.getConnectionCreationDate() || now;

      if (!created || now.valueOf() - created.valueOf() < 2 * 60 * 1000) {
         return;
      }

      Notification.notify({
         title: contact.getName(),
         message: Translation.t('has_come_online'),
         source: contact,
      });
   };
}
