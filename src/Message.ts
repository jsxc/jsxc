import Storage from './Storage'
import Attachment from './Attachment'
import JID from './JID'
import * as CONST from './CONST'
import Emoticons from './Emoticons'
import IIdentifiable from './Identifiable.interface'
import Client from './Client'
import Utils from './util/Utils'
import { IMessage, DIRECTION, IMessagePayload, MessageMark } from './Message.interface'
import { ContactType } from './Contact.interface'
import PersistentMap from './util/PersistentMap'
import UUID from './util/UUID'
import Pipe from '@util/Pipe';
import { IJID } from './JID.interface';

const ATREGEX = new RegExp('(xmpp:)?(' + CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i');

export default class Message implements IIdentifiable, IMessage {

   public static exists(uid: string) {
      let data = PersistentMap.getData(Client.getStorage(), uid);

      return !!(data && data.attrId);
   }

   private static formattingPipe = new Pipe();

   private static formatText(text: string, direction: DIRECTION, peer: IJID, senderName: string): Promise<string> {
      return Message.formattingPipe.run(text, direction, peer, senderName).then(args => args[0]);
   }

   public static addFormatter(formatter: (text: string, direction: DIRECTION, peer?: IJID, senderName?: string) => Promise<[string, DIRECTION, IJID, string]> | string, priority?: number) {
      Message.formattingPipe.addProcessor((text: string, direction: DIRECTION, peer: IJID, senderName: string) => {
         let returnValue = formatter(text, direction, peer, senderName);

         if (typeof returnValue === 'string') {
            return Promise.resolve([returnValue, direction, peer, senderName]);
         }

         return returnValue;
      }, priority);
   }

   private uid: string;

   private data: PersistentMap;

   private attachment: Attachment;

   public static readonly DIRECTION = DIRECTION;

   public static readonly MSGTYPE = ContactType;

   private storage: Storage;

   constructor(uid: string);
   constructor(data: IMessagePayload);
   constructor(arg0) {
      this.storage = Client.getStorage();
      let data;

      if (typeof arg0 === 'string' && arg0.length > 0 && arguments.length === 1) {
         this.uid = arg0;
      } else if (typeof arg0 === 'object' && arg0 !== null) {
         data = arg0;

         this.uid = data.uid || UUID.v4();
         data.attrId = data.attrId || this.uid;

         delete data.uid;
      }

      this.data = new PersistentMap(this.storage, this.uid);

      if (data) {
         if (data.peer) {
            data.peer = data.peer.full;
         }

         if (data.sender?.jid) {
            data.sender.jid = data.sender.jid?.toString();
         }

         if (data.attachment instanceof Attachment) {
            this.attachment = data.attachment;
            data.attachment = data.attachment.getUid();
         }

         this.data.set($.extend({
            unread: true,
            mark: MessageMark.pending,
            encrypted: null,
            forwarded: false,
            stamp: new Date().getTime(),
            type: ContactType.CHAT,
            encryptedHtmlMessage: null,
            encryptedPlaintextMessage: null
         }, data));
      } else if (!this.data.get('attrId')) {
         throw new Error(`Could not load message ${this.uid}`);
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
         attachment.delete();
      }

      this.data.delete();

      this.attachment = undefined;
      this.data = undefined;
      this.uid = undefined;
   }

   public getNextId(): string {
      return this.data.get('next');
   }

   public setNext(message: IMessage | string | undefined): void {
      let nextId = typeof message === 'string' || typeof message === 'undefined' ? message : message.getUid();

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

   public isSystem(): boolean {
      return this.getDirection() === DIRECTION.SYS;
   }

   public isIncoming(): boolean {
      return this.getDirection() === DIRECTION.IN || this.getDirection() === DIRECTION.PROBABLY_IN;
   }

   public isOutgoing(): boolean {
      return this.getDirection() === DIRECTION.OUT || this.getDirection() === DIRECTION.PROBABLY_OUT;
   }

   public getAttachment(): Attachment {
      if (!this.attachment && this.data.get('attachment')) {
         this.attachment = new Attachment(this.data.get('attachment'));
      }

      return this.attachment;
   }

   public setAttachment(attachment: Attachment) {
      this.attachment = attachment;

      this.data.set('attachment', attachment.getUid());
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
      let sender = this.data.get('sender');

      return {
         name: sender?.name,
         jid: sender?.jid ? new JID(sender.jid) : undefined,
      };
   }

   public getMark(): MessageMark {
      return this.data.get('mark');
   }

   public aborted() {
      let currentMark = this.data.get('mark', MessageMark.pending);

      if (currentMark === MessageMark.pending) {
         this.data.set('mark', MessageMark.aborted);
      }
   }

   public isAborted(): boolean {
      return this.data.get('mark', MessageMark.aborted) === MessageMark.aborted;
   }

   public transferred() {
      let currentMark = this.data.get('mark', MessageMark.pending);

      this.data.set('mark', Math.max(currentMark, MessageMark.transferred));
   }

   public isTransferred(): boolean {
      return this.data.get('mark', MessageMark.pending) >= MessageMark.transferred;
   }

   public received() {
      let currentMark = this.data.get('mark', MessageMark.pending);

      this.data.set('mark', Math.max(currentMark, MessageMark.received));
   }

   public isReceived(): boolean {
      //this.data.get('received') is deprecated since 4.0.x
      return this.data.get('mark', MessageMark.pending) >= MessageMark.received || !!this.data.get('received');
   }

   public displayed() {
      let currentMark = this.data.get('mark', MessageMark.pending);

      this.data.set('mark', Math.max(currentMark, MessageMark.displayed));
   }

   public isDisplayed(): boolean {
      return this.data.get('mark', MessageMark.pending) >= MessageMark.displayed;
   }

   public acknowledged() {
      this.data.set('mark', MessageMark.acknowledged);
   }

   public isAcknowledged(): boolean {
      return this.data.get('mark', MessageMark.pending) >= MessageMark.acknowledged;
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

   public async getProcessedBody(): Promise<string> {
      let body = this.getPlaintextMessage();

      body = Utils.escapeHTML(body);
      body = await Message.formatText(body, this.getDirection(), this.getPeer(), this.getSender().name);

      return `<p dir="auto">${body}</p>`;
   }

   public getPlaintextEmoticonMessage(): string {
      let body = this.getPlaintextMessage();

      body = Utils.escapeHTML(body);
      body = Emoticons.toImage(body);

      return body;
   }

   public setErrorMessage(error: string) {
      return this.data.set('errorMessage', error);
   }

   public getErrorMessage(): string {
      return this.data.get('errorMessage');
   }

   public updateProgress(transferred: number, size: number) {
      this.data.set('progress', transferred / size);
   }
}

function convertUrlToLink(text: string) {
   return text.replace(CONST.REGEX.URL, function(url) {
      let href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
   });
}

function convertEmailToLink(text: string) {
   return text.replace(ATREGEX, function(str, protocol, jid, action) {
      if (protocol === 'xmpp:') {
         if (typeof action === 'string') {
            jid += action;
         }

         return '<a href="xmpp:' + jid + '">xmpp:' + jid + '</a>';
      }

      return '<a href="mailto:' + jid + '" target="_blank">' + jid + '</a>';
   });
}

function convertGeoToLink(text: string) {
   return text.replace(CONST.REGEX.GEOURI, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
   })
}

function markQuotation(text: string) {
   return text.split(/(?:\n|\r\n|\r)/).map(line => {
      return line.indexOf('&gt;') === 0 ? '<span class="jsxc-quote">' + line.replace(/^&gt; ?/, '') + '</span>' : line;
   }).join('\n');
}

function replaceLineBreaks(text: string) {
   return text.replace(/(\r\n|\r|\n){2}/g, '</p><p dir="auto">').replace(/(\r\n|\r|\n)/g, '<br/>');
}

Message.addFormatter(convertUrlToLink);
Message.addFormatter(convertEmailToLink);
Message.addFormatter(convertGeoToLink);
Message.addFormatter(Emoticons.toImage.bind(Emoticons));
Message.addFormatter(markQuotation);
Message.addFormatter(replaceLineBreaks);
