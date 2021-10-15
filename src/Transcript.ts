import Message from './Message';
import { IMessage as IMessage, DIRECTION } from './Message.interface';
import Contact from './Contact';
import Storage from './Storage';
import PersistentMap from './util/PersistentMap';
import Log from '@util/Log';
import Client from './Client';

export default class Transcript {
   private properties: PersistentMap;

   private firstMessage: IMessage;

   private lastMessage: IMessage;

   private messages: { [index: string]: IMessage } = {};

   constructor(storage: Storage, private contact: Contact) {
      this.properties = new PersistentMap(storage, 'transcript', contact.getId());

      this.properties.registerHook('firstMessageId', firstMessageId => {
         this.firstMessage = this.getMessage(firstMessageId);
      });
   }

   public insertMessage(message: IMessage)
   {

      if (!this.messages||this.messages[message.getUid()])
      {
         return;
      }

      let indexMessageArray = this.convertToIndexArray(this.messages);

      for (let i = indexMessageArray.length-1;i>=0;i--)
      {
         if (indexMessageArray[i].getStamp().getTime()<message.getStamp().getTime())
         {
            if (i-1>0)
            {
               message.setNext(indexMessageArray[i]);
            }
            else
            {
               message.setNext(undefined);
            }

            if (i+1<indexMessageArray.length)
            {
               indexMessageArray[i+1].setNext(message);
            }
            break;
         }
      }

      this.firstMessage = indexMessageArray[indexMessageArray.length-1];

      this.contact.setLastMessageDate(message.getStamp());
      this.properties.set('firstMessageId', this.firstMessage.getUid());

      if (message.getReplaceId()===null)
      {
         this.addMessage(message);
      }
   }

   public unshiftMessage(message: IMessage) {
      let lastMessage = this.getLastMessage();

      if (lastMessage) {
         lastMessage.setNext(message);
      } else {
         this.pushMessage(message);
      }

      message.setNext(undefined);

      this.lastMessage = message;
   }

   public convertToIndexArray(messages:{[key: string]: IMessage}): IMessage[] {
     
      let indexMessageArray = new Array();

      for (let strId in messages)
      {
         indexMessageArray.push(messages[strId]);
      }

      indexMessageArray.sort(function compare(a:IMessage, b:IMessage) {
         if (a.getStamp().getTime() === b.getStamp().getTime()) {
            return 0;
         }

         if (a.getStamp().getTime() < b.getStamp().getTime()) {
            return -1;
         }

         if (a.getStamp().getTime() > b.getStamp().getTime()) {
            return +1;
         }
      });

      return indexMessageArray;
   }

   public processReplace(message:IMessage,mam:boolean=false)
   {
       let chain =  this.getReplaceMessageChainFromMessage(message);
       let oldmessage = this.findMessageByAttrId(chain[0].getReplaceId());   
       let latestMessage = chain[chain.length-1];   
       if (oldmessage&&oldmessage.getReplaceId()===null)
       {
           //only allow corrections form same sender
           if (latestMessage.getDirection()===DIRECTION.IN) //reset Marker to transfered on outgoing messages
           {
               let oldsender = oldmessage.getSender().jid!==undefined?oldmessage.getSender().jid.full:oldmessage.getPeer().full;
               let replaceSender = latestMessage.getSender().jid!==undefined?latestMessage.getSender().jid.full:latestMessage.getPeer().full;
               if (oldsender===replaceSender)
               {
                   latestMessage.getProcessedBody().then((bodyString)=> {
                      oldmessage.setReplaceBody(bodyString);
                      if (mam)
                      {
                         oldmessage.setReplaceStamp(latestMessage.getStamp());
                      }
                   }); 
                   latestMessage.received(); //reset Marker to received on incoming messages
               }
           }
           else
           if (latestMessage.getDirection()===DIRECTION.OUT)
           {
               latestMessage.getProcessedBody().then((bodyString)=> {
                  oldmessage.setReplaceBody(bodyString);
                  if (mam)
                  {
                     oldmessage.setReplaceStamp(latestMessage.getStamp());
                  }
               });
               latestMessage.transferred(); //reset Marker to transfered on outgoing messages               
           }
       }
   }

   public getLatestReplaceMessageFromMessage(message : IMessage) : IMessage {
      let replacemsg = this.getReplaceMessageChainFromMessage(message);
      if (replacemsg!==null&&replacemsg.length>0)
      {
         return replacemsg[replacemsg.length-1];
      }
      else
         return null;
   }

   public getReplaceMessageChainFromMessage(message : IMessage) : IMessage[] {
      let resultChain = new Array();
      resultChain.push(message);

      let recursive = (message: IMessage) :IMessage => {
         let replacemsg = null;
         let messages = this.getMessages();
         for (let key in messages)
         {
            let tmpmessage = messages[key];
            if (tmpmessage.getReplaceId()!==null&&tmpmessage.getReplaceId()===message.getAttrId())
            {
               replacemsg=tmpmessage;
               break;
            }
         }
         
         if (replacemsg!==null)
         {
            resultChain.push(replacemsg);

            let deep = recursive(replacemsg);
            if (deep!==null)
            {               
               replacemsg=deep;
            }
         }
         
         return replacemsg;
      };

      recursive(message);

      return resultChain;
   }

   public pushMessage(message: IMessage) {

      if (message.getReplaceId()!==null)
      {
         this.processReplace(message);
      }

      if (!message.getNextId() && this.firstMessage) {
         message.setNext(this.firstMessage);
      }

      this.addMessage(message);

      if (message.getDirection() !== DIRECTION.SYS) {
         this.contact.setLastMessageDate(message.getStamp());
      }

      this.properties.set('firstMessageId', message.getUid());

      this.deleteLastMessages();
   }

   public getFirstChatMessage(): IMessage {
      for (let message of this.getGenerator()) {
         if (!message.isSystem()) {
            return message;
         }
      }
   }

   public getFirstMessage(): IMessage {
      if (!this.firstMessage && this.properties.get('firstMessageId')) {
         this.firstMessage = this.getMessage(this.properties.get('firstMessageId'));
      }

      return this.firstMessage;
   }

   public getLastMessage(): IMessage {
      if (this.lastMessage) {
         return this.lastMessage;
      }

      let ids = [];
      let lastMessage = this.getFirstMessage();

      while (lastMessage && lastMessage.getNextId()) {
         let id = lastMessage.getNextId();

         if (ids.indexOf(id) > -1) {
            Log.debug('Loop detected');
            break;
         }

         ids.push(id);

         lastMessage = this.getMessage(id);
      }

      return (this.lastMessage = lastMessage);
   }

   public getMessage(id: string): IMessage {
      if (!this.messages[id] && id) {
         try {
            this.messages[id] = new Message(id);

            this.messages[id].registerHook('unread', unread => {
               if (!unread) {
                  this.removeMessageFromUnreadMessages(this.messages[id]);
               }
            });
         } catch (err) {
            Log.warn(err);

            return undefined;
         }
      }

      return this.messages[id];
   }

   public getMessages(): {[key: string]: IMessage} {     
      return this.messages;
   }

   public *getGenerator() {
      let message = this.getFirstMessage();

      while (message) {
         yield message;

         let nextId = message.getNextId();

         message = nextId ? this.getMessage(nextId) : undefined;
      }
   }

   public findMessageByAttrId(attrId: string): IMessage {
      for (let message of this.getGenerator()) {
         if (message.getAttrId() === attrId) {
            return message;
         }
      }
   }

   private deleteLastMessages() {
      let allowedNumberOfMessages = parseInt(Client.getOption('numberOfMessages'), 10);
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
      this.lastMessage = undefined;

      this.properties.remove('firstMessageId');
   }

   public registerNewMessageHook(func: (newValue: any, oldValue: any) => void) {
      this.registerHook('firstMessageId', func);
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

   private removeMessageFromUnreadMessages(message: IMessage) {
      let unreadMessageIds: string[] = this.properties.get('unreadMessageIds') || [];

      if (message && unreadMessageIds.includes(message.getUid())) {
         this.properties.set(
            'unreadMessageIds',
            unreadMessageIds.filter(id => id !== message.getUid())
         );
      }
   }

   private addMessage(message: IMessage) {
      let id = message.getUid();

      this.messages[id] = message;

      if (message.getDirection() !== DIRECTION.OUT && message.isUnread()) {
         let unreadMessageIds = this.properties.get('unreadMessageIds') || [];
         unreadMessageIds.push(id);
         this.properties.set('unreadMessageIds', unreadMessageIds);

         message.registerHook('unread', unread => {
            if (!unread) {
               this.removeMessageFromUnreadMessages(message);
            }
         });
      }
   }
}
