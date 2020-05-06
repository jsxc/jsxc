import MessageArchiveManagementPlugin from './Plugin'
import Message from '../../Message'
import { IContact as Contact } from '../../Contact.interface'
import JID from '../../JID'
import UUID from '../../util/UUID'
import Utils from '../../util/Utils'
import Log from '../../util/Log'
import Translation from '../../util/Translation'
import * as Namespace from '../../connection/xmpp/namespace'
import { IMessage, MessageMark } from '@src/Message.interface';
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
         endDate = lastMessage ? lastMessage.getStamp() : undefined;
      }

      let connection = this.plugin.getConnection();
      this.plugin.determineServerSupport(this.archiveJid).then(version => {
         if (!version) {
            throw new Error(`Archive JID ${this.archiveJid.full} has no support for MAM.`);
         }

         let jid = !this.contact.isGroupChat() ? this.contact.getJid() : undefined;

         return connection.queryArchive(this.archiveJid, <string> version, queryId, jid, firstResultId, endDate);
      }).then(this.onComplete)
         .catch((stanza) => {
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

      let delayElement = forwardedElement.find('delay[xmlns="urn:xmpp:delay"]');
      let stamp = (delayElement.length > 0) ? new Date(delayElement.attr('stamp')) : new Date();

      let plaintextBody = Utils.removeHTML(messageElement.find('> body').text());
      let htmlBody = messageElement.find('html body' + Namespace.getFilter('XHTML'));

      if (!plaintextBody) {
         return;
      }

      let direction = (this.contact.getJid().bare === to.bare) ? Message.DIRECTION.OUT : Message.DIRECTION.IN;

      let stanzaIdElement = messageElement.find('stanza-id[xmlns="urn:xmpp:sid:0"]');
      let originIdElement = messageElement.find('origin-id[xmlns="urn:xmpp:sid:0"]');
      let uid = direction === Message.DIRECTION.OUT && originIdElement.length ? originIdElement.attr('id') : stanzaIdElement.attr('id');

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
         sender: undefined,
      };

      if (this.contact.isGroupChat()) {
         messageProperties.sender = {
            name: from.resource,
         };

         let contact = <MultiUserContact> this.contact;

         messageProperties.direction = contact.getNickname() === from.resource ? Message.DIRECTION.OUT : Message.DIRECTION.IN;
      }

      return new Message(messageProperties);
   }

   public onComplete = async (stanza: Element) => {
      let stanzaElement = $(stanza);
      let finElement = stanzaElement.find(`fin[xmlns^="urn:xmpp:mam:"]`);

      if (finElement.length !== 1) {
         Log.warn('No fin element found');
         return;
      }

      let transcript = this.contact.getTranscript();

      while (this.messageCache.length > 0) {
         let messageElement = this.messageCache.pop();

         try {
            let message = await this.parseForwardedMessage(messageElement);

            transcript.unshiftMessage(message);
         } catch (err) {
            continue;
         }
      }

      let isArchiveExhausted = finElement.attr('complete') === 'true';
      let firstResultId = finElement.find('first').text();
      let queryId = finElement.attr('queryid');

      if (isArchiveExhausted) {
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
   }
}
