import Message from './Message';
import { IMessage as IMessage, DIRECTION } from './Message.interface';
import Contact from './Contact';
import Storage from './Storage';
import PersistentMap from './util/PersistentMap';
import Log from '@util/Log';
import Client from './Client';
import Translation from '@util/Translation';

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
         if (lastMessage.getUid()===message.getUid())
         {
            return;
         }
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
         if(this.isValidMessage(messages[strId]))
         {
            indexMessageArray.push(messages[strId]);
         }
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

   public processRetract(message:IMessage)
   {
      if (message===undefined||message.getDirection()===DIRECTION.SYS)
         return;

      let chain =  this.getReplaceMessageChainFromMessage(message);
      if (message.getDirection()!==DIRECTION.SYS&&chain!==null)
      {
         let replaceSender = message.getSender().jid!==undefined?message.getSender().jid.full:message.getPeer().full;
         for (let i=chain.length-1;i>=0;i--)
         {
            let oldsender = chain[i].getSender().jid!==undefined?chain[i].getSender().jid.full:chain[i].getPeer().full;

            //check vor occupant-id (XEP-0421) in old message > if available on old message it the replacement has to be the same!

            if ((chain[i].getOccupantId()!==null&&chain[i].getOccupantId()===message.getOccupantId())||
               (chain[i].getOccupantId()===null&&oldsender===replaceSender))
            {
               chain[i].setReplaceTime(message.getStamp().getTime());
               chain[i].setPlaintextMessage(Translation.t('RETRACTION_BODY'));
               if (i>0&&chain[i].getRetractId()===null)
               {
                  chain[i].setRetractId(chain[i].getReplaceId());
               }
               if (i===0&&chain.length>1&&!chain[i].isRetracted)
               {
                  chain[i].setRetracted(true);
               }

               message.received(); //reset Marker to received on incoming messages
            }
         }

         if (chain.length===1)
         {
            let target = this.findMessageByAttrId(message.getRetractId());
            if (target)
            {
               target.setPlaintextMessage(Translation.t('RETRACTION_BODY'));
               target.setRetracted(true);
               target.setReplaceTime(message.getStamp().getTime());
            }
         }

         if (message.getDirection()===DIRECTION.IN||message.getDirection()===DIRECTION.PROBABLY_IN)
         {
            message.received();
         }
         else
         {
            message.transferred();
         }
      }
   }

   public processReplace(message:IMessage)
   {
       if (message===undefined||(<any>message).data===undefined||message.getDirection()===DIRECTION.SYS)
         return;

       let oldmessage = this.findMessageByAttrId(message.getReplaceId());

       if (oldmessage!==undefined && (<any>oldmessage).data!==undefined)
       {
           //only allow corrections from same sender
           if (message.getDirection()===DIRECTION.IN||message.getDirection()===DIRECTION.PROBABLY_IN) //reset Marker to transfered on outgoing messages
           {
               let oldsender = oldmessage.getSender().jid!==undefined?oldmessage.getSender().jid.full:oldmessage.getPeer().full;
               let replaceSender = message.getSender().jid!==undefined?message.getSender().jid.full:message.getPeer().full;
               //check vor occupant-id (XEP-0421) in old message > if available on old message it the replacement has to be the same!

               if ((oldmessage.getOccupantId()!==null&&oldmessage.getOccupantId()===message.getOccupantId())||
                   (oldmessage.getOccupantId()===null&&oldsender===replaceSender))
               {
                  oldmessage.setReplaceBody(message.getPlaintextMessage().replace(/(?:(https?\:\/\/[^\s]+))/m, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'));
                  oldmessage.setReplaceTime(message.getStamp().getTime());
                  /*message.getProcessedBody().then((bodyString)=> {
                     try {
                        oldmessage.setReplaceTime(message.getStamp().getTime());
                     }
                     catch (e) {
                        console.warn('This should not happen!? in Message.ts > getStamp() this.data.get() failed because this.data was not defined',e);
                     }
                     oldmessage.setReplaceBody(bodyString);
                   }); */
                   message.received(); //reset Marker to received on incoming messages
               }
           }
           else
           if (message.getDirection()===DIRECTION.OUT||message.getDirection()===DIRECTION.PROBABLY_OUT)
           {
               message.getProcessedBody().then((bodyString)=> {
                  oldmessage.setReplaceTime(message.getStamp().getTime());                  
                  oldmessage.setReplaceBody(bodyString);
               });
               message.transferred(); //reset Marker to transfered on outgoing messages
           }
       }
   }

   public getLatestOutgoingMessageForEdit() : IMessage {

      let firstMessage = this.getFirstMessage();

      do {
         if (!firstMessage.isRetracted())
         {
            if (firstMessage.getDirection()===DIRECTION.OUT||
               firstMessage.getDirection()===DIRECTION.PROBABLY_OUT)
            {
               if (firstMessage.getReplaceId()===null&&firstMessage.getRetractId()===null)
               {
                  return firstMessage;
               }
            }
         }

      } while ((firstMessage=this.getMessage(firstMessage.getNextId()))!==null&&firstMessage!==undefined);

      return null;
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

   private isValidMessage(message: any): boolean{
      return message!==null&&message!==undefined&&message.uid!==undefined&&message.data!==undefined;
   }

   public getReplaceMessageChainFromMessage(message : IMessage) : IMessage[] {

      let result :IMessage[] = [];

      let firstMessage;
      if (message.getReplaceId()!==null&&message.getReplaceId()!==undefined)
      {
         let msg = this.getMessage(message.getReplaceId());
         if (msg!==undefined)
         {
            result = this.getReplaceMessageChainFromMessage(msg);
         }
         result.push(message);
         return result;
      }
      else
      {
         firstMessage = this.getFirstMessage();
         if (firstMessage!==undefined)
         {
            do
            {
               if (firstMessage.getReplaceId()===message.getAttrId())
               {
                  result.push(firstMessage);
               }
            } while ((firstMessage=this.getMessage(firstMessage.getNextId()))!==null&&firstMessage!==undefined);
         }
         result.push(message);

         return result.reverse();
      }
   }

   public pushMessage(message: IMessage) {

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

         if (message!==undefined&&message!==null) {
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

   public isDuplicatate(message: IMessage)
   {
      if (message.getAttrId()===null||message.getAttrId()===undefined)
      {
         return false;
      }

      let findmsg = this.findMessageByAttrId(message.getAttrId());
      if (findmsg===null||findmsg===undefined)
      {
         return false;
      }

      return true;
   }

   private addMessage(message: IMessage) {

      if (this.isDuplicatate(message))
      {
         return;
      }
      let id = message.getUid();

      this.messages[id] = message;

      if (message!==undefined&&message.getReplaceId()!==null)
      {
         this.processReplace(message);
      }

      if (message!==undefined&&message.getRetractId()!==null)
      {
         this.processRetract(message);
      }

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