import MessageArchiveManagementPlugin from './Plugin';
import Message from '../../Message';
import { IContact as Contact } from '../../Contact.interface';
import JID from '../../JID';
import UUID from '../../util/UUID';
import Utils from '../../util/Utils';
import Log from '../../util/Log';
import Translation from '../../util/Translation';
import * as Namespace from '../../connection/xmpp/namespace';
import { DIRECTION, IMessage, MessageMark } from '@src/Message.interface';
import { IJID } from '@src/JID.interface';
import MultiUserContact from '@src/MultiUserContact';

export default class Archive {
   private archiveJid: IJID;
   private messageCache: JQuery<HTMLElement>[] = [];

   constructor(private plugin: MessageArchiveManagementPlugin, private contact: Contact) {
      let jid = contact.isGroupChat() ? contact.getJid() : plugin.getConnection().getJID();

      this.archiveJid = new JID(jid.bare);
   }

   public clear() {
      this.setExhausted(false);
      this.setFirstResultId(undefined);
   }

   private getId() {
      return this.contact.getJid().bare;
   }

   private getFirstResultId(): string {
      return this.plugin.getStorage().getItem('firstResultId', this.getId()) || '';
   }

   private setFirstResultId(resultId: string) {
      return this.plugin.getStorage().setItem('firstResultId', this.getId(), resultId);
   }

   public isExhausted(): boolean {
      return !!this.plugin.getStorage().getItem('exhausted', this.getId());
   }

   private setExhausted(exhausted: boolean) {
      return this.plugin.getStorage().setItem('exhausted', this.getId(), exhausted);
   }

   public registerExhaustedHook(hook: (isExhausted) => void) {
      let storage = this.plugin.getStorage();
      let key = storage.generateKey('exhausted', this.getId());

      storage.registerHook(key, hook);
   }

   public lastMessages() {

      if (this.messageCache.length > 0) {
         Log.debug('Ongoing message retrieval');
         return false;
      }

      let messages = this.contact.getTranscript().getMessages();
      if (messages===undefined||messages===null)
         return;

      let queryId = UUID.v4();

      this.plugin.addQueryContactRelation(queryId, this.contact);
      let connection = this.plugin.getConnection();

      let lastMessage = this.contact.getTranscript().getLastMessage();
      while (lastMessage!==undefined&&(<any>lastMessage).data!==undefined&&lastMessage.getDirection()===DIRECTION.SYS)
      {
         lastMessage = this.contact.getTranscript().getMessage(lastMessage.getNextId());
         if (lastMessage===undefined)
         {
            break;
         }
      }
      if (lastMessage!==undefined&&lastMessage!==null&&(<any>lastMessage).data!==undefined)
      {
         let startDate = lastMessage.getStamp();
         startDate.setSeconds(startDate.getSeconds() + 1);
         this.plugin
            .determineServerSupport(this.archiveJid)
            .then(version => {
               if (!version) {
                  throw new Error(`Archive JID ${this.archiveJid.full} has no support for MAM.`);
               }

               return connection.queryArchiveSync(startDate, this.archiveJid, <string>version, queryId,this.contact.getJid().bare );
            })
            .then(this.onCompleteSync)
            .catch(stanza => {
               Log.warn('Error while requesting archive', stanza);
            });
      }
   }

   public nextMessages() {
      if (this.isExhausted()) {
         Log.debug('No more archived messages.');
         return false;
      }

      if (this.messageCache.length > 0) {
         Log.debug('Ongoing message retrieval');
         return false;
      }

      let queryId = UUID.v4();

      this.plugin.addQueryContactRelation(queryId, this.contact);

      let firstResultId = this.getFirstResultId();
      let endDate: Date;

      if (!firstResultId) {
         let lastMessage = this.contact.getTranscript().getLastMessage();
         if (lastMessage!==undefined&&(<any>lastMessage).data!==undefined) {
            while (lastMessage.getDirection()===DIRECTION.SYS)
            {
               lastMessage = this.contact.getTranscript().getBefore(lastMessage);
               if (lastMessage===undefined||(<any>lastMessage).data===undefined)
               {
                  endDate = undefined;
                  break;
               }
            }
            if (lastMessage!==undefined&&(<any>lastMessage).data!==undefined) {
               endDate = lastMessage.getStamp();
               endDate.setSeconds(endDate.getSeconds() - 1);
            }
         } else {
            endDate = undefined;
         }
      }

      let connection = this.plugin.getConnection();
      this.plugin
         .determineServerSupport(this.archiveJid)
         .then(version => {
            if (!version) {
               throw new Error(`Archive JID ${this.archiveJid.full} has no support for MAM.`);
            }

            let jid = !this.contact.isGroupChat() ? this.contact.getJid() : undefined;

            return connection.queryArchive(this.archiveJid, <string>version, queryId, jid, firstResultId, endDate);
         })
         .then(this.onComplete)
         .catch(stanza => {
            Log.warn('Error while requesting archive', stanza);
         });
   }

   public onForwardedMessage(forwardedElement: JQuery<HTMLElement>) {
      this.messageCache.push(forwardedElement);
   }

   public async parseForwardedMessage(forwardedElement: JQuery<HTMLElement>): Promise<IMessage> {
      let messageElement = forwardedElement.find('message');
      let messageId = messageElement.attr('id');

      if (messageElement.length !== 1) {
         return;
      }

      let from = new JID(messageElement.attr('from'));
      let to = new JID(messageElement.attr('to'));

      if (this.archiveJid.bare !== from.bare && this.archiveJid.bare !== to.bare) {
         return;
      }

      if (this.contact.getJid().bare !== to.bare && this.contact.getJid().bare !== from.bare)
      {
         return;
      }

      let delayElement = forwardedElement.find('delay[xmlns="urn:xmpp:delay"]');
      let stamp = delayElement.length > 0 ? new Date(delayElement.attr('stamp')) : new Date();

      let plaintextBody = Utils.removeHTML(messageElement.find('> body').text());
      let htmlBody = messageElement.find('html body' + Namespace.getFilter('XHTML'));

      if (!plaintextBody) {
         return;
      }

      let direction = this.contact.getJid().bare === to.bare ? Message.DIRECTION.PROBABLY_OUT : Message.DIRECTION.PROBABLY_IN;

      let stanzaIdElement = messageElement.find('stanza-id[xmlns="urn:xmpp:sid:0"]');
      let originIdElement = messageElement.find('origin-id[xmlns="urn:xmpp:sid:0"]');

      let replaceId = messageElement.find('replace[xmlns="urn:xmpp:message-correct:0"]').length>0?messageElement.find('replace[xmlns="urn:xmpp:message-correct:0"]').attr('id'):null;
      let occupantId = messageElement.find('occupant-id[xmlns="urn:xmpp:occupant-id:0"]').length>0?messageElement.find('occupant-id[xmlns="urn:xmpp:occupant-id:0"]').attr('id'):null;
      let retractId = null;

      if (messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').length>0&&messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').find('retract[xmlns="urn:xmpp:message-retract:0"]').length>0)
      {
         retractId = messageElement.find('apply-to[xmlns="urn:xmpp:fasten:0"]').attr('id');
      }

      if (retractId!==null)
      {
         replaceId=null;
      }

      let uid =
         direction === Message.DIRECTION.PROBABLY_OUT && originIdElement.length
            ? originIdElement.attr('id')
            : stanzaIdElement.attr('id');

      if (Message.exists(uid)) {
         return new Message(uid);
      }

      let messageProperties = {
         uid,
         attrId: messageId,
         peer: this.contact.getJid(),
         direction,
         plaintextMessage: plaintextBody,
         htmlMessage: htmlBody.html(),
         stamp: stamp.getTime(),
         mark: MessageMark.transferred,
         unread: false,
         sender: undefined
      };

      if (this.contact.isGroupChat()) {
         messageProperties.sender = {
            name: from.resource,
         };

         let contact = <MultiUserContact>this.contact;

         messageProperties.direction =
            contact.getNickname() === from.resource ? Message.DIRECTION.PROBABLY_OUT : Message.DIRECTION.PROBABLY_IN;
      }

      let result = new Message(messageProperties);
      result.setReplaceId(replaceId);
      result.setOccupantId(occupantId);
      result.setRetractId(retractId);
      return result;
   }

   public onComplete = async (stanza: Element) => {
      let stanzaElement = $(stanza);
      let finElement = stanzaElement.find(`fin[xmlns^="urn:xmpp:mam:"]`);

      if (finElement.length !== 1) {
         Log.warn('No fin element found');
         return;
      }

      let transcript = this.contact.getTranscript();
      let replaceMessagesKeys = new Array();
      let retractMessagesKeys = new Array();

      while (this.messageCache.length > 0) {
         let messageElement = this.messageCache.pop();

         try {
            let message = await this.parseForwardedMessage(messageElement);

            if (message.getReplaceId()!==null)
            {
               replaceMessagesKeys.push({attrid:message.getAttrId(),uid:message.getUid()});
            }

            if (message.getRetractId()!==null)
            {
               retractMessagesKeys.push({attrid:message.getAttrId(),uid:message.getUid()});
            }
            if (!transcript.isDuplicatate(message))
            {
               transcript.unshiftMessage(message);
            }

         } catch (err) {
            continue;
         }
      }

      let isArchiveExhausted = finElement.attr('complete') === 'true';
      let firstResultId = finElement.find('first').text();
      let queryId = finElement.attr('queryid');

      if (replaceMessagesKeys.length>0)
      {
         let arr : {[key: string]: IMessage} = {};
        
         for (let key of replaceMessagesKeys)
         {
            let tmp = transcript.getMessage(key.uid);
            let keystr=key.uid;
            if (tmp===undefined||tmp===null)
            {
               tmp = transcript.getMessage(key.attrid);
               keystr=key.uid;
            }
          
            if (tmp!==undefined&&tmp!==null)
            {
               arr[keystr]=tmp;
            }
         }
         let indexedArr = transcript.convertToIndexArray(arr);
         for (let i=0;i<indexedArr.length;i++)
         {
            transcript.processReplace(indexedArr[i]);
         }
      }

      if (retractMessagesKeys.length>0)
      {
         let arr : {[key: string]: IMessage} = {};

         for (let key of retractMessagesKeys)
         {
            let tmp = transcript.getMessage(key.uid);
            let keystr=key.uid;
            if (tmp===undefined||tmp===null)
            {
               tmp = transcript.getMessage(key.attrid);
               keystr=key.uid;
            }

            if (tmp!==undefined&&tmp!==null)
            {
               arr[keystr]=tmp;
            }
         }
         let indexedArr = transcript.convertToIndexArray(arr);
         for (let i=0;i<indexedArr.length;i++)
         {
            transcript.processRetract(indexedArr[i]);
         }
      }

      if (isArchiveExhausted&&!this.isExhausted()) {
         let archiveExhaustedMessage = new Message({
            peer: this.contact.getJid(),
            direction: Message.DIRECTION.SYS,
            plaintextMessage: Translation.t('Archive_exhausted'),
            mark: MessageMark.transferred,
            unread: false,
         });

         transcript.unshiftMessage(archiveExhaustedMessage);
      }

      this.setExhausted(isArchiveExhausted);
      this.setFirstResultId(firstResultId);
      this.plugin.removeQueryContactRelation(queryId);
   };

   public onCompleteSync = async (stanza: Element) => {
      let stanzaElement = $(stanza);
      let finElement = stanzaElement.find(`fin[xmlns^="urn:xmpp:mam:"]`);

      if (finElement.length !== 1) {
         Log.warn('No fin element found');
         return;
      }

      let transcript = this.contact.getTranscript();
      let replaceMessagesKeys = new Array();
      let retractMessagesKeys = new Array();

      while (this.messageCache.length > 0) {
         let messageElement = this.messageCache.pop();

         try {
            let message = await this.parseForwardedMessage(messageElement);

            if (message.getReplaceId()!==null)
            {
               replaceMessagesKeys.push({attrid:message.getAttrId(),uid:message.getUid()});
            }

            if (message.getRetractId()!==null)
            {
               retractMessagesKeys.push({attrid:message.getAttrId(),uid:message.getUid()});
            }
            if (!transcript.isDuplicatate(message))
            {
               transcript.insertMessage(message);
            }

         } catch (err) {
            continue;
         }
      }

      if (replaceMessagesKeys.length>0)
      {
         let arr : {[key: string]: IMessage} = {};
         for (let key of replaceMessagesKeys)
         {
            let tmp = transcript.getMessage(key.uid);
            let keystr=key.uid;
            if (tmp===undefined||tmp===null)
            {
               tmp = transcript.getMessage(key.attrid);
               keystr=key.uid;
            }
          
            if (tmp!==undefined&&tmp!==null)
            {
               arr[keystr]=tmp;
            }
         }
         let indexedArr = transcript.convertToIndexArray(arr);
         for (let i=0;i<indexedArr.length;i++)
         {
            transcript.processReplace(indexedArr[i]);
         }
      }

      if (retractMessagesKeys.length>0)
      {
         let arr : {[key: string]: IMessage} = {};

         for (let key of retractMessagesKeys)
         {
            let tmp = transcript.getMessage(key.uid);
            let keystr=key.uid;
            if (tmp===undefined||tmp===null)
            {
               tmp = transcript.getMessage(key.attrid);
               keystr=key.uid;
            }

            if (tmp!==undefined&&tmp!==null)
            {
               arr[keystr]=tmp;
            }
         }
         let indexedArr = transcript.convertToIndexArray(arr);
         for (let i=0;i<indexedArr.length;i++)
         {
            transcript.processRetract(indexedArr[i]);
         }
      }

      let queryId = finElement.attr('queryid');
      this.plugin.removeQueryContactRelation(queryId);
   };
}