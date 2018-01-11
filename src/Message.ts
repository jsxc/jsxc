import Storage from './Storage';
import Log from './util/Log';
import Options from './Options';
import Attachment from './Attachment';
import JID from './JID'
import * as CONST from './CONST'
import Emoticons from './Emoticons'
import Translation from './util/Translation'
import Identifiable from './IdentifiableInterface'
import Client from './Client'
import Utils from './util/Utils'
import { MessageInterface, DIRECTION } from './MessageInterface'
import { ContactType } from './ContactInterface'
import PersistentMap from './util/PersistentMap'
import UUID from './util/UUID'

const MSGPOSTFIX = ':msg';

const ATREGEX = new RegExp('(xmpp:)?(' + CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i');

interface MessagePayload {
   peer: JID,
   direction: DIRECTION,
   attrId?: string,
   uid?: string,
   plaintextMessage?: string,
   htmlMessage?: string,
   errorMessage?: string,
   attachment?: Attachment,
   received?: boolean,
   encrypted?: boolean,
   forwarded?: boolean,
   stamp?: number,
   type?: ContactType,
   unread?: boolean,
   encryptedHtmlMessage?: string,
   encryptedPlaintextMessage?: string,
   sender?: {
      name: string,
      jid?: JID
   }
}

export default class Message implements Identifiable, MessageInterface {

   private uid: string;

   private data: PersistentMap;

   private attachment: Attachment;

   private stamp: Date;

   static readonly DIRECTION = DIRECTION;

   static readonly MSGTYPE = ContactType;

   private storage: Storage;

   constructor(uid: string);
   constructor(data: MessagePayload);
   constructor(arg0) {
      this.storage = Client.getStorage();
      let data;

      if (typeof arg0 === 'string' && arg0.length > 0 && arguments.length === 1) {
         this.uid = arg0;
      } else if (typeof arg0 === 'object' && arg0 !== null) {
         data = arg0;

         this.uid = data.uid || UUID.v4();
         data.attrId = data.attrId || new Date().getTime() + MSGPOSTFIX;

         delete data.uid;
      }

      this.data = new PersistentMap(this.storage, this.uid);

      if (data) {
         if (data.peer) {
            data.peer = data.peer.full;
         }

         if (data.attachment instanceof Attachment) {
            this.attachment = data.attachment;
            data.attachment = data.attachment.getUid();
         }

         this.data.set($.extend({
            received: false,
            encrypted: null,
            forwarded: false,
            stamp: new Date().getTime(),
            type: ContactType.CHAT,
            encryptedHtmlMessage: null,
            encryptedPlaintextMessage: null
         }, data));
      } else if (!this.data.get('attrId')) {
         throw `Could not load message ${this.uid}`;
      }
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      this.data.registerHook(property, func);
   }

   public getId() {
      console.trace('Deprecated Message.getId called');
      return this.getUid();
   }

   public getUid(): string {
      return this.uid;
   }

   public getAttrId(): string {
      return this.data.get('attrId');
   }

   public delete() {
      let attachment = this.getAttachment();

      if (attachment) {
         // attachment.delete()
      }

      this.data.delete();

      this.attachment = undefined;
      this.data = undefined;
      this.uid = undefined;
   }

   public getNextId(): string {
      return this.data.get('next');
   }

   public setNext(message: Message | string) {
      let nextId = typeof message === 'string' ? message : message.getUid();

      // this.data.set('next', nextId);

      if (this.getNextId() === this.uid) {
         console.trace('Loop detected ' + this.uid);
      } else {
         this.data.set('next', nextId);
      }
   }

   public getCssId(): string {
      return this.uid.replace(/:/g, '-');
   }

   public getDOM(): JQuery<HTMLElement> {
      return $('#' + this.getCssId());
   }

   public getStamp(): Date {
      return new Date(this.data.get('stamp'));
   }

   public getDirection(): DIRECTION {
      return this.data.get('direction');
   }

   public getDirectionString(): string {
      return DIRECTION[this.getDirection()].toLowerCase();
   }

   public getAttachment(): Attachment {
      if (!this.attachment) {
         this.attachment = new Attachment(this.data.get('attachment'));
      }

      return this.attachment;
   }

   public setAttachment(attachment: Attachment) {
      this.attachment = attachment;

      this.data.set('attachment', attachment.getUid());

      // if (this.getDirection() === DIRECTION.OUT) {
      //    // save storage
      //    attachment.clearData();
      // }
      //
      // let saved = attachment.save();
      //
      // if (!saved && this.getDirection() === DIRECTION.IN) {
      //    //@TODO inform user
      // }
   }

   public getPeer(): JID {
      return new JID(this.data.get('peer'));
   }

   public getType(): ContactType {
      return this.data.get('type');
   }

   public getTypeString(): string {
      return ContactType[this.getType()].toLowerCase();
   }

   public getHtmlMessage(): string {
      return this.data.get('htmlMessage');
   }

   public setHtmlMessage(htmlMessage: string) {
      this.data.set('htmlMessage', htmlMessage);
   }

   public getEncryptedHtmlMessage(): string {
      return this.data.get('encryptedHtmlMessage');
   }

   public getPlaintextMessage(): string {
      return this.data.get('plaintextMessage');
   }

   public getEncryptedPlaintextMessage(): string {
      return this.data.get('encryptedPlaintextMessage');
   }

   public getSender(): { name: string, jid?: JID } {
      return this.data.get('sender') || { name: null };
   }

   public received() {
      this.data.set('received', true);
   }

   public isReceived(): boolean {
      return !!this.data.get('received');
   }

   public isForwarded(): boolean {
      return !!this.data.get('forwarded');
   }

   public isEncrypted(): boolean {
      return !!this.data.get('encrypted');
   }

   public hasAttachment(): boolean {
      return !!this.data.get('attachment');
   }

   public isUnread(): boolean {
      return !!this.data.get('unread');
   }

   public read() {
      this.data.set('unread', false);
   }

   public setDirection(direction: DIRECTION) {
      this.data.set('direction', direction)
   }

   public setPlaintextMessage(plaintextMessage: string) {
      this.data.set('plaintextMessage', plaintextMessage);
   }

   public setEncryptedPlaintextMessage(encryptedPlaintextMessage: string) {
      this.data.set('encryptedPlaintextMessage', encryptedPlaintextMessage);
   }

   public setEncrypted(encrypted: boolean = false) {
      this.data.set('encrypted', encrypted);
   }

   public getProcessedBody(): string {
      let body = this.getPlaintextMessage();
      body = Utils.escapeHTML(body);

      //@REVIEW maybe pipes
      body = this.convertUrlToLink(body);
      body = this.convertEmailToLink(body);
      body = Emoticons.toImage(body);

      body = this.replaceLineBreaks(body);

      // hide unprocessed otr messages
      if (body.match(/^\?OTR([:,|?]|[?v0-9x]+)/)) {
         body = '<i title="' + body + '">' + Translation.t('Unreadable_OTR_message') + '</i>';
      }

      return `<p>${body}</p>`;
   }

   public getErrorMessage(): string {
      return this.data.get('errorMessage');
   }

   public updateProgress(transfered: number, complete: number) {

   }

   private replaceLineBreaks(text) {
      return text.replace(/(\r\n|\r|\n)/g, '<br />');
   }

   private convertUrlToLink(text) {
      return text.replace(CONST.REGEX.URL, function(url) {
         let href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

         return '<a href="' + href + '" target="_blank">' + url + '</a>';
      });
   }

   private convertEmailToLink(text) {
      return text.replace(ATREGEX, function(undefined, protocol, jid, action) {
         if (protocol === 'xmpp:') {
            if (typeof action === 'string') {
               jid += action;
            }

            return '<a href="xmpp:' + jid + '">xmpp:' + jid + '</a>';
         }

         return '<a href="mailto:' + jid + '" target="_blank">mailto:' + jid + '</a>';
      });
   }
}
