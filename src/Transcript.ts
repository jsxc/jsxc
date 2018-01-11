import Message from './Message';
import Contact from './Contact';
import Storage from './Storage';
import PersistentMap from './util/PersistentMap'

export default class Transcript {
   private properties: PersistentMap;

   private firstMessage: Message;

   private messages = {};

   constructor(storage: Storage, contact: Contact) {
      this.properties = new PersistentMap(storage, 'transcript', contact.getId());

      this.properties.registerHook('firstMessageId', (firstMessageId) => {
         this.firstMessage = this.getMessage(firstMessageId);
      });
   }

   public pushMessage(message: Message) {
      if (!message.getNextId() && this.firstMessage) {
         message.setNext(this.firstMessage);
      }

      this.addMessage(message);

      this.properties.set('firstMessageId', message.getUid());
   }

   public getFirstMessage(): Message {
      if (!this.firstMessage && this.properties.get('firstMessageId')) {
         this.firstMessage = this.getMessage(this.properties.get('firstMessageId'));
      }

      return this.firstMessage;
   }

   public getLastMessage(): Message {
      let lastMessage = this.getFirstMessage();

      while (lastMessage && lastMessage.getNextId()) {
         lastMessage = this.getMessage(lastMessage.getNextId());
      }

      return lastMessage;
   }

   public getMessage(id: string): Message {
      if (!this.messages[id] && id) {
         this.messages[id] = new Message(id);
      }

      return this.messages[id];
   }

   public clear() {
      let message = this.getFirstMessage();
      let nextMessage: Message;

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

   private addMessage(message: Message) {
      let id = message.getUid();

      this.messages[id] = message;

      if (message.getDirection() === Message.DIRECTION.IN) {
         let unreadMessageIds = this.properties.get('unreadMessageIds') || [];
         unreadMessageIds.push(id); console.log('unreadMessageIds', unreadMessageIds)
         this.properties.set('unreadMessageIds', unreadMessageIds);
      }
   }
}
