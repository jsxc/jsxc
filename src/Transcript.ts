import Message from './Message'
import { IMessage as IMessage, DIRECTION } from './Message.interface'
import Contact from './Contact'
import Storage from './Storage'
import PersistentMap from './util/PersistentMap'
import Options from './Options';
import Log from '@util/Log';

export default class Transcript {
   private properties: PersistentMap;

   private firstMessage: IMessage;

   private messages: { [index: string]: IMessage } = {};

   constructor(storage: Storage, contact: Contact) {
      this.properties = new PersistentMap(storage, 'transcript', contact.getId());

      this.properties.registerHook('firstMessageId', (firstMessageId) => {
         this.firstMessage = this.getMessage(firstMessageId);
      });
   }

   public pushMessage(message: IMessage) {
      if (!message.getNextId() && this.firstMessage) {
         message.setNext(this.firstMessage);
      }

      this.addMessage(message);

      this.properties.set('firstMessageId', message.getUid());

      this.deleteLastMessages();
   }

   public getFirstMessage(): IMessage {
      if (!this.firstMessage && this.properties.get('firstMessageId')) {
         this.firstMessage = this.getMessage(this.properties.get('firstMessageId'));
      }

      return this.firstMessage;
   }

   public getLastMessage(): IMessage {
      let lastMessage = this.getFirstMessage();

      while (lastMessage && lastMessage.getNextId()) {
         lastMessage = this.getMessage(lastMessage.getNextId());
      }

      return lastMessage;
   }

   public getMessage(id: string): IMessage {
      if (!this.messages[id] && id) {
         try {
            this.messages[id] = new Message(id);
         } catch (err) {
            Log.warn(err);

            return undefined;
         }
      }

      return this.messages[id];
   }

   private deleteLastMessages() {
      let allowedNumberOfMessages = parseInt(Options.get().get('numberOfMessages'));
      let numberOfMessages = 0;

      if (allowedNumberOfMessages <= 0 || isNaN(allowedNumberOfMessages)) {
         return;
      }

      let message = this.getFirstMessage();
      let nextMessage: IMessage;

      while (message) {
         nextMessage = this.getMessage(message.getNextId());

         numberOfMessages++;

         if (numberOfMessages === allowedNumberOfMessages) {
            message.setNext(undefined);
         } else if (numberOfMessages > allowedNumberOfMessages) {
            message.delete();
         }

         message = nextMessage;
      }
   }

   public clear() {
      let message = this.getFirstMessage();
      let nextMessage: IMessage;

      while (message) {
         nextMessage = this.getMessage(message.getNextId());

         message.delete();

         message = nextMessage;
      }

      this.messages = {};
      this.firstMessage = undefined;

      this.properties.remove('firstMessageId')
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      this.properties.registerHook(property, func);
   }

   public markAllMessagesAsRead() {
      let unreadMessageIds = this.properties.get('unreadMessageIds') || [];

      for (let id of unreadMessageIds) {
         let message = this.messages[id];

         if (message) {
            message.read();
         }
      }

      this.properties.set('unreadMessageIds', []);
   }

   public getNumberOfUnreadMessages(): number {
      let unreadMessageIds = this.properties.get('unreadMessageIds') || [];

      return unreadMessageIds.length;
   }

   private addMessage(message: IMessage) {
      let id = message.getUid();

      this.messages[id] = message;

      if (message.getDirection() === DIRECTION.IN) {
         let unreadMessageIds = this.properties.get('unreadMessageIds') || [];
         unreadMessageIds.push(id);
         this.properties.set('unreadMessageIds', unreadMessageIds);
      }
   }
}
