import Storage from './Storage';
import Log from './util/Log';
import Options from './Options';
import Attachment from './Attachment';
import StorageSingleton from './StorageSingleton';
import JID from './JID'
import * as CONST from './CONST'
import Emoticons from './Emoticons'
import Translation from './util/Translation'
import Identifiable from './IdentifiableInterface'
import Client from './Client'
import Utils from './util/Utils'
import {MessageInterface, DIRECTION, MSGTYPE} from './MessageInterface'

const MSGPOSTFIX = ':msg';

const ATREGEX = new RegExp('(xmpp:)?(' + CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i');

interface MessagePayload {
   peer:JID,
   direction:DIRECTION,
   plaintextMessage?:string,
   htmlMessage?:string,
   errorMessage?:string,
   attachment?:Attachment,
   received?:boolean,
   encrypted?:boolean,
   forwarded?:boolean,
   stamp?:number,
   type?:MSGTYPE,
}

export default class Message implements Identifiable, MessageInterface {

   private uid:string;

   private payload:MessagePayload = {
      received: false,
      encrypted: null,
      forwarded: false,
      stamp: new Date().getTime(),
      type: MSGTYPE.CHAT
   } as any;

   static readonly DIRECTION = DIRECTION;

   static readonly MSGTYPE = MSGTYPE;

   private storage:Storage;

   constructor(uid:string);
   constructor(data:MessagePayload);
   constructor() {
      this.storage = Client.getStorage();

      if (typeof arguments[0] === 'string' && arguments[0].length > 0 && arguments.length === 1) {
         this.uid = arguments[0];

         this.load(this.uid);
      } else if (typeof arguments[0] === 'object' && arguments[0] !== null) { console.log('arg', arguments[0])
         $.extend(this.payload, arguments[0]);
      }

      if (!this.uid) {
         this.uid = new Date().getTime() + MSGPOSTFIX;
      }
   }

   public getId() {
      return this.uid;
   }

   public save() {
      let attachment = this.getAttachment();

      if (attachment) {
         if (this.getDirection() === DIRECTION.OUT) {
            // save storage
            attachment.clearData();
         }

         let saved = attachment.save();

         if (!saved && this.getDirection() === DIRECTION.IN) {
            //@TODO inform user
         }
      }

      let payloadCopy = $.extend({}, this.payload); //Object.assign
      if (payloadCopy.attachment) {
         payloadCopy.attachment = payloadCopy.attachment.getId();
      }

      this.storage.setItem('msg', this.uid, {
         payload: payloadCopy
      });

      return this;
   }

   public delete() {
      var data = this.storage.getItem('msg', this.uid);

      if (data) {
         this.storage.removeItem('msg', this.uid);
      }
   }

   public getCssId() {
      return this.uid.replace(/:/g, '-');
   }

   public getDOM() {
      return $('#' + this.getCssId());
   }

   public getStamp() {
      return this.payload.stamp;
   }

   public getDirection():DIRECTION {
      return this.payload.direction;
   }

   public getDirectionString():string {
      return DIRECTION[this.payload.direction].toLowerCase();
   }

   public getAttachment():Attachment {
      return this.payload.attachment;
   }

   public getPeer():JID {
      return this.payload.peer;
   }

   public getType():MSGTYPE {
      return this.payload.type;
   }

   public getTypeString():string {
      return MSGTYPE[this.payload.type].toLowerCase();
   }

   public getHtmlMessage():string {
      return this.payload.htmlMessage;
   }

   public getPlaintextMessage():string {
      return this.payload.plaintextMessage;
   }

   public received() {
      this.payload.received = true;
      this.save();

      this.getDOM().addClass('jsxc_received');
   }

   public isReceived():boolean {
      return this.payload.received;
   }

   public isForwarded():boolean {
      return this.payload.forwarded;
   }

   public isEncrypted():boolean {
      return this.payload.encrypted;
   }

   public hasAttachment():boolean {
      return !!this.payload.attachment;
   }

   public setUnread() {

   }

   public getProcessedBody():string {
      let body = this.payload.plaintextMessage;

      body = this.convertUrlToLink(body);

      body = this.convertEmailToLink(body);

      body = Emoticons.toImage(body);

      body = this.replaceLineBreaks(body);

      // hide unprocessed otr messages
      if (body.match(/^\?OTR([:,|?]|[?v0-9x]+)/)) {
         body = '<i title="' + body + '">' + Translation.t('Unreadable_OTR_message') + '</i>';
      }

      return body;
   }

   public getErrorMessage():string {
      return this.payload.errorMessage;
   }

   private load(uid:string):void {
      var data = this.storage.getItem('msg', uid);
window._storage = this.storage;
      if (!data) {
         Log.debug('Could not load message with uid ' + uid);

         throw new Error('Could not load message with uid ' + uid)
      }

      $.extend(this.payload, data.payload);

      if (data.attachment) {
         this.payload.attachment = new Attachment(data.attachment);
      }
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
