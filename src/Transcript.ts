import Message from './Message';
import Contact from './Contact';
import Storage from './Storage';
import PersistentMap from './util/PersistentMap'

export default class Transcript {
   private properties:PersistentMap;

   private firstMessage:Message;

   private lastMessage:Message;

   private messages = {};

   constructor(storage:Storage, contact:Contact) {
      this.properties = new PersistentMap(storage, 'transcript', contact.getId());

      this.properties.registerHook('firstMessageId', (firstMessageId) => {
         this.firstMessage = this.getMessage(firstMessageId);
      });
   }

   public pushMessage(message:Message) {
      if (!message.getNextId() && this.firstMessage) {
         message.setNext(this.firstMessage);
      }

      this.addMessage(message);

      this.properties.set('firstMessageId', message.getId());
   }

   public getFirstMessage():Message {
      if (!this.firstMessage && this.properties.get('firstMessageId')) {
         this.firstMessage = this.getMessage(this.properties.get('firstMessageId'));
      }

      return this.firstMessage;
   }

   public setLastMessage(message:Message) {
      this.lastMessage = message;
   }

   public getMessage(id:string):Message {
      if (!this.messages[id] && id) {
         this.messages[id] = new Message(id);
      }

      return this.messages[id];
   }

   public clear() {
      let message = this.getFirstMessage();
      let nextMessage:Message;

      while(message) {
         nextMessage = this.getMessage(message.getNextId());

         message.delete();

         message = nextMessage;
      }

      this.messages = {};
      this.firstMessage = undefined;
      this.lastMessage = undefined;

      this.properties.remove('firstMessageId')
   }

   public registerHook(property:string, func:(newValue:any, oldValue:any)=>void) {
      this.properties.registerHook(property, func);
   }

   private addMessage(message:Message) {
      this.messages[message.getId()] = message;
   }
}
