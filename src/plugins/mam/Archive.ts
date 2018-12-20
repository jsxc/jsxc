import MessageArchiveManagementPlugin from './Plugin'
import Message from '../../Message'
import { IContact as Contact } from '../../Contact.interface'
import JID from '../../JID'
import UUID from '../../util/UUID'
import Utils from '../../util/Utils'
import Log from '../../util/Log'
import Translation from '../../util/Translation'
import * as Namespace from '../../connection/xmpp/namespace'

export default class Archive {
   private previousMessage;
   private lastMessageId;
   private connected;

   constructor(private plugin: MessageArchiveManagementPlugin, private contact: Contact) {

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

   private isExhausted(): boolean {
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

   public nextMessages() {

      let queryId = UUID.v4();

      if (this.isExhausted()) {
         Log.debug('No more archived messages.');
         return false;
      }

      this.plugin.addQueryContactRelation(queryId, this.contact);

      let firstResultId = this.getFirstResultId();
      let endDate;

      if (!firstResultId) {
         let lastMessage = this.contact.getTranscript().getLastMessage();
         endDate = lastMessage ? lastMessage.getStamp() : undefined;

         this.lastMessageId = lastMessage ? lastMessage.getUid() : undefined;
         this.connected = false;
      }

      let connection = this.plugin.getConnection();
      connection.queryArchive(this.contact.getJid(), queryId, firstResultId, endDate)
         .then(this.onComplete)
         .catch((stanza) => {
            console.warn('Error while requesting archive', stanza);
         });
   }

   public onForwardedMessage(forwardedElement: JQuery<HTMLElement>) {
      let messageElement = forwardedElement.find('message');
      let messageId = messageElement.attr('id');

      if (messageElement.length !== 1) {
         return;
      }

      let ownJid = this.plugin.getConnection().getJID();
      let from = new JID(messageElement.attr('from'));
      let to = new JID(messageElement.attr('to'));

      if (ownJid.bare !== from.bare && ownJid.bare !== to.bare) {
         return;
      }

      let delayElement = forwardedElement.find('delay[xmlns="urn:xmpp:delay"]');
      let stamp = (delayElement.length > 0) ? new Date(delayElement.attr('stamp')) : new Date();

      let plaintextBody = Utils.removeHTML(messageElement.find('> body').text());
      let htmlBody = messageElement.find('html body' + Namespace.getFilter('XHTML'));

      if (!plaintextBody || plaintextBody.match(/\?OTR/i)) {
         //@TODO show summary of number of encrypted messages
         return;
      }

      let direction = (this.contact.getJid().bare === to.bare) ? Message.DIRECTION.OUT : Message.DIRECTION.IN;

      let stanzaIdElement = messageElement.find('stanza-id[xmlns="urn:xmpp:sid:0"]');
      let originIdElement = messageElement.find('origin-id[xmlns="urn:xmpp:sid:0"]');
      let uid = direction === Message.DIRECTION.OUT && originIdElement.length ? originIdElement.attr('id') : stanzaIdElement.attr('id');

      let message
      try {
         message = this.contact.getTranscript().getMessage(uid);
      } catch (err) {
         message = new Message({
            uid,
            attrId: messageId,
            peer: this.contact.getJid(),
            direction,
            plaintextMessage: plaintextBody,
            htmlMessage: htmlBody.html(),
            stamp: stamp.getTime()
         });
      }

      if (this.previousMessage) {
         message.setNext(this.previousMessage);
      }

      if (this.lastMessageId === message.getUid()) {
         this.connected = true;
      }

      this.previousMessage = message;
   }

   public onComplete = (stanza) => {
      let stanzaElement = $(stanza);
      let finElement = stanzaElement.find(`fin` + Namespace.getFilter('MAM'));

      if (finElement.length !== 1) {
         Log.warn('No fin element found');
         return;
      }

      let isArchiveExhausted = finElement.attr('complete') === 'true';
      let firstResultId = finElement.find('first').text();
      let queryId = finElement.attr('queryid');

      if (this.previousMessage && !this.connected) {
         let transcript = this.contact.getTranscript();
         let lastMessage = transcript.getLastMessage();

         if (lastMessage) {
            lastMessage.setNext(this.previousMessage);
         } else {
            transcript.pushMessage(this.previousMessage);
         }

         if (isArchiveExhausted) {
            let archiveExhaustedMessage = new Message({
               peer: this.contact.getJid(),
               direction: Message.DIRECTION.SYS,
               plaintextMessage: Translation.t('Archive_exhausted')
            });

            transcript.getLastMessage().setNext(archiveExhaustedMessage);
         }
      }

      this.connected = undefined;
      this.lastMessageId = undefined;
      this.previousMessage = undefined;

      this.setExhausted(isArchiveExhausted);
      this.setFirstResultId(firstResultId);
      this.plugin.removeQueryContactRelation(queryId);
   }
}
