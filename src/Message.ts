import Storage from './Storage';
import Log from './util/Log';
import Options from './Options';
import Attachment from './Attachment';
import StorageSingleton from './StorageSingleton';
import JID from './JID'
import * as CONST from './CONST'
import Emoticons from './Emoticons'
import Translation from './util/Translation'

export default class Message {

   public bid = null;

   public _uid = null;

   public _received = false;

   public encrypted = null;

   public forwarded = false;

   public stamp = new Date().getTime();

   public direction;

   public body:string;

   public attachment:Attachment;

   public format = Message.PLAIN;

   public type = Message.CHAT;

   public receiver:JID;

   public error;

   static readonly CHAT = 'chat';

   static readonly GROUPCHAT = 'groupchat';

   static readonly PLAIN = 'plain';

   static readonly SYS = 'sys';

   static readonly HTML = 'html';

   static readonly IN = 'in';

   static readonly OUT = 'out';

   private storage:Storage;

   constructor(uid:string);
   constructor(data:any); //@TODO any is not specific enough
   constructor() {
      this.storage = StorageSingleton.getUserStorage();

      if (typeof arguments[0] === 'string' && arguments[0].length > 0 && arguments.length === 1) {
         this._uid = arguments[0];

         this.load(this._uid);
      } else if (typeof arguments[0] === 'object' && arguments[0] !== null) {
         $.extend(this, arguments[0]);
      }

      if (!this._uid) {
         // @TODO use constant for :msg?
         this._uid = new Date().getTime() + ':msg';
      }
   }

   private load(uid:string):void {
      var data = this.storage.getItem('msg', uid);

      if (!data) {
         Log.debug('Could not load message with uid ' + uid);
      }

      $.extend(this, data);
   }

   public save() {
      var history;

      if (this.bid) {
         // @REVIEW MessageHistory class?
         history = this.storage.getItem('history', this.bid) || [];

         if (history.indexOf(this._uid) < 0) {
            if (history.length > Options.get('numberOfMsg')) {
               (new Message(history.pop())).delete();
            }
         } else {
            history = null;
         }
      }

      if (this.attachment) {
         if (this.direction === 'out') {
            // save storage
            this.attachment.clearData();
         }

         let saved = this.attachment.save();

         if (!saved && this.direction === Message.IN) {
            //@TODO inform user
         }
      }

      var data;

      // @TODO this will not work, because properties of this are not accessable for Storage
      this.storage.setItem('msg', this._uid, this);

      if (history) {
         history.unshift(this._uid);

         this.storage.setItem('history', this.bid, history);
      }

      return this;
   }

   public delete() {
      var data = this.storage.getItem('msg', this._uid);

      if (data) {
         this.storage.removeItem('msg', this._uid);

         if (data.bid) {
            var history = this.storage.getItem('history', data.bid) || [];

            history = $.grep(history, function(el) {
               return el !== this._uid;
            });

            this.storage.setItem('history', data.bid, history);
         }
      }
   }

   public getCssId() {
      return this._uid.replace(/:/g, '-');
   }

   public getDOM() {
      return $('#' + this.getCssId());
   }

   public getStamp() {
      return this.stamp;
   }

   public received() {
      this._received = true;
      this.save();

      this.getDOM().addClass('jsxc_received');
   }

   public isReceived():boolean {
      return this._received;
   }

   public setUnread() {

   }

   public getProcessedBody():string {
      let body = this.body;

      // @TODO filter html

      body = body.replace(CONST.REGEX.URL, function(url) {
         let href = (url.match(/^https?:\/\//i)) ? url : 'http://' + url;

         return '<a href="' + href + '" target="_blank">' + url + '</a>';
      });

      let atRegex = new RegExp('(xmpp:)?(' + CONST.REGEX.JID.source + ')(\\?[^\\s]+\\b)?', 'i');

      body = body.replace(atRegex, function(undefined, protocol, jid, action) {
         if (protocol === 'xmpp:') {
            if (typeof action === 'string') {
               jid += action;
            }

            return '<a href="xmpp:' + jid + '">xmpp:' + jid + '</a>';
         }

         return '<a href="mailto:' + jid + '" target="_blank">mailto:' + jid + '</a>';
      });

      body = Emoticons.toImage(body);

      // replace line breaks
      body = body.replace(/(\r\n|\r|\n)/g, '<br />');

      if (this.direction === Message.IN) {
         body = body.replace(/^\/me /, '<i title="/me">' + jsxc.removeHTML(this.sender.getName()) + '</i> ');
      }

      // hide unprocessed otr messages
      if (body.match(/^\?OTR([:,|?]|[?v0-9x]+)/)) {
         body = '<i title="' + body + '">' + Translation.t('Unreadable_OTR_message') + '</i>';
      }

      return body;
   }
}
