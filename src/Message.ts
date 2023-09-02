import Storage from './Storage';
import Attachment from './Attachment';
import JID from './JID';
import * as CONST from './CONST';
import Emoticons from './Emoticons';
import IIdentifiable from './Identifiable.interface';
import Client from './Client';
import Utils from './util/Utils';
import { IMessage, DIRECTION, IMessagePayload, MessageMark } from './Message.interface';
import { ContactType } from './Contact.interface';
import PersistentMap from './util/PersistentMap';
import UUID from './util/UUID';
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

   public static addFormatter(
      formatter: (
         text: string,
         direction: DIRECTION,
         peer?: IJID,
         senderName?: string
      ) => Promise<[string, DIRECTION, IJID, string]> | string,
      priority?: number
   ) {
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

   private replacedBy: IMessage;

   private original: IMessage;

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

         this.data.set(
            $.extend(
               {
                  unread: true,
                  mark: MessageMark.pending,
                  encrypted: null,
                  forwarded: false,
                  stamp: new Date().getTime(),
                  type: ContactType.CHAT,
                  encryptedHtmlMessage: null,
                  encryptedPlaintextMessage: null,
               },
               data
            )
         );
      } else if (!this.data.get('attrId')) {
         throw new Error(`Could not load message ${this.uid}`);
      }
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      this.data.registerHook(property, func);
   }

   public getId() {
      // eslint-disable-next-line no-console
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
         // eslint-disable-next-line no-console
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

   public getSender(): { name: string; jid?: JID } {
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
      this.data.set('direction', direction);
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

   public setStyled(styled: boolean) {
      //XEP - 0393
      this.data.set('styled', styled);
   }

   public isStyled(): boolean {
      //XEP - 0393
      return this.data.get('styled') === undefined ? true : this.data.get('styled');
   }

   public async getProcessedBody(): Promise<string> {
      let body = this.getPlaintextMessage();

      body = Utils.escapeHTML(body);
      if (this.isStyled()) {
         body = await Message.formatText(body, this.getDirection(), this.getPeer(), this.getSender().name);
      }

      return `<p dir="auto">${body}</p>`;
   }

   public getPlaintextEmoticonMessage(emotions: 'unicode' | 'image' = 'image'): string {
      let body = this.getPlaintextMessage();

      body = Utils.escapeHTML(body);
      body = emotions === 'unicode' ? Emoticons.toUnicode(body) : Emoticons.toImage(body);

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

   public getLastVersion(): IMessage {
      let replacedBy = this.getReplacedBy();

      while (replacedBy && replacedBy.getReplacedBy()) {
         replacedBy = replacedBy.getReplacedBy();
      }

      return replacedBy || this;
   }

   public getReplacedBy(): IMessage {
      if (this.replacedBy) {
         return this.replacedBy;
      }

      const replacedByUid = this.data.get('replacedBy');

      this.replacedBy = replacedByUid ? new Message(replacedByUid) : undefined;

      return this.replacedBy;
   }

   public setReplacedBy(message: IMessage): void {
      this.data.set('replacedBy', message.getUid());
   }

   public getOriginal(): IMessage {
      if (this.original) {
         return this.original;
      }

      const originalUid = this.data.get('original');

      this.original = originalUid ? new Message(originalUid) : undefined;

      return this.original;
   }

   public setOriginal(message: IMessage): void {
      this.data.set('original', message.getUid());
   }

   public isReplacement(): boolean {
      return !!this.data.get('original');
   }
}

function convertUrlToLink(text: string) {
   return text.replace(CONST.REGEX.URL, function (url) {
      let href = url.match(/^https?:\/\//i) ? url : 'http://' + url;
      let parts = href.split('.');
      let trustedDomains = Client.getOption('trustedDomains') || false;
      let isTrusted = false;

      if (trustedDomains) {
         for (let dom in trustedDomains) {
            let regex = new RegExp(':.*//.*' + dom);
            if (regex.test(url)) {
               isTrusted = true;
               break;
            }
         }
      }

      if (parts.length > 1 && /(jpeg|jpg|gif|png|svg)/i.test(parts[parts.length - 1]) && isTrusted) {
         return Attachment.generateLightImageAttachement(url);
      } else {
         return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
      }
   });
}

function convertEmailToLink(text: string) {
   return text.replace(ATREGEX, function (str, protocol, jid, action) {
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
   return text.replace(CONST.REGEX.GEOURI, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
   });
}

function markQuotation(text: string) {
   let inpre = 0;
   return text
      .split(/(?:\n|\r\n|\r)/)
      .map(line => {
         inpre = line.indexOf('<code>') >= 0 || line.indexOf('</code>') >= 0 ? inpre + 1 : inpre;
         if (inpre === 0) {
            if (line.indexOf('&gt;') === 0) {
               line = '<span class="jsxc-quote">' + line.replace(/^&gt; ?/, '') + '</span>';
            }
         } else if (inpre === 1) {
            if (line.indexOf('&gt;') === 0) {
               line =
                  '<span class="jsxc-quote">' +
                  line.replace(/^&gt; ?/, '').replace(/<code>/, '<span class="jsxc-pre">');
               inpre++;
            }
         } else if (inpre === 2) {
            line = line.replace(/^&gt; ?/, '');
         } else if (inpre === 3) {
            line = line.replace(/^&gt; ?/, '').replace(/<\/code>/, '</span>') + '</span>';
            inpre = 0;
         }

         return line;
      })
      .join('\n');
}

function regexIndexOf(text: string, regex: RegExp, startpos: number): number {
   let indexOf = text.substring(startpos || 0).search(regex);
   return indexOf >= 0 ? indexOf + (startpos || 0) : indexOf;
}

function transformBold(text: string): string {
   return transformText(text, /\*(?=[\S])/, /(?<=[^\*\s])(\*)/, '<b>', '</b>');
}

function transformItalic(text: string): string {
   if (!text.startsWith('<a')) return transformText(text, /\_(?=[\S])/, /(?<=[^\_\s])(\_)/, '<i>', '</i>');
   else return text;
}

function transformStrike(text: string): string {
   if (!text.startsWith('<a')) return transformText(text, /\~(?=[\S])/, /(?<=[^\~\s])(\~)/, '<s>', '</s>');
   else return text;
}

function transformPre(text: string): string {
   return transformText(text, /\`(?=[\S])/, /(?<=[^\`\s(\\`)]|&gt; |\n)(\`)/, '<code>', '</code>');
}

function transformText(
   text: string,
   startkey: RegExp,
   endkey: RegExp,
   replaceStart: string,
   replaceEnd: string
): string {
   let pos1 = 0;
   let found = false;
   do {
      found = false;
      pos1 = regexIndexOf(text, startkey, pos1);
      if (pos1 !== -1) {
         let pos2 = regexIndexOf(text, endkey, pos1);
         if (pos2 !== -1) {
            let styledpart = text.substring(pos1 + 1, pos2);
            if (replaceStart === '<pre>' && replaceEnd === '</pre>') {
               styledpart = styledpart.replace('<b>', '').replace('</b>', '');
               styledpart = styledpart.replace('<s>', '').replace('</s>', '');
               styledpart = styledpart.replace('<i>', '').replace('</i>', '');
            }
            if (
               text.substring(pos1, pos2).indexOf('\\n') === -1 ||
               (replaceStart === '<pre>' && replaceEnd === '</pre>')
            ) {
               let result = text.substring(0, pos1) + replaceStart + styledpart + replaceEnd + text.substring(pos2 + 1);
               text = result;
               found = true;
            }
         }
      }
   } while (found);

   return text;
}

function textStyling(plaintext: string) {
   plaintext = transformBold(plaintext);
   plaintext = transformItalic(plaintext);
   plaintext = transformStrike(plaintext);
   plaintext = transformPre(plaintext);
   return plaintext;
}

function replaceLineBreaks(text: string) {
   return text.replace(/(\r\n|\r|\n){2}/g, '</p><p dir="auto">').replace(/(\r\n|\r|\n)/g, '<br/>');
}

Message.addFormatter(convertUrlToLink);
Message.addFormatter(convertEmailToLink);
Message.addFormatter(convertGeoToLink);
Message.addFormatter(Emoticons.toImage.bind(Emoticons));
Message.addFormatter(textStyling);
Message.addFormatter(markQuotation);
Message.addFormatter(replaceLineBreaks);
