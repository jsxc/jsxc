import JID from '../../JID';
import Message from '../../Message';
import Options from '../../Options'
import * as CONST from '../../CONST';
import {IConnection} from '../ConnectionInterface';
import {Strophe} from 'strophe';
import * as NS from './namespace'
import XMPPHandler from './handler'
import onRoster from './handlers/roster'
import Log from '../../util/Log'

export default class XMPPConnection implements IConnection {
   private handler;

   constructor(private connection:Strophe.Connection) {
      this.handler = new XMPPHandler(connection);
      this.handler.registerHandler();
   }

   public loadVcard(jid:JID) {
      let self = this;

      return new Promise(function(resolve, reject) {
         self.connection.vcard.get(resolve, jid.bare, reject);
      }).then(this.parseVcard);
   };

   public getCapabilitiesByJid(jid:JID):any {

   };

   public addContact(jid:JID, alias:string) {
      let waitForRoster = this.addContactToRoster(jid, alias);

      this.sendSubscriptionRequest(jid);

      return waitForRoster;
   };

   public removeContact(jid:JID) {
      let self = this;

      // Shortcut to remove buddy from roster and cancle all subscriptions
      let iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: NS.get('roster')
      }).c('item', {
         jid: jid.bare,
         subscription: 'remove'
      });

      // @TODO
      // jsxc.gui.roster.purge(bid);

      return new Promise(function(resolve, reject) {
         self.connection.sendIQ(iq, resolve, reject);
      });
   };

   public renameContact(jid:JID, name:string) {
      //@TODO maybe replace jid with contact?

      if (d.type === 'chat') {
         var iq = $iq({
            type: 'set'
         }).c('query', {
            xmlns: NS.get('roster')
         }).c('item', {
            jid: jid.bare,
            name: name
         });
         this.connection.sendIQ(iq);
      } else if (d.type === 'groupchat') {
         jsxc.xmpp.bookmarks.add(bid, newname, d.nickname, d.autojoin);
      }
   }

   public sendMessage(message:Message) {
      // @TODO pipes
      let body = message.body;

      let xmlMsg = $msg({
         to: message.receiver.full,
         type: message.type,
         id: message._uid
      });

      if (message.format === Message.HTML) {
         xmlMsg.c('html', {
            xmlns: Strophe.NS.XHTML_IM
         });

         // Omit StropheJS XEP-0071 limitations
         let xmlBody = Strophe.xmlElement('body', {
            xmlns: Strophe.NS.XHTML
         });
         xmlBody.innerHTML = body;

         xmlMsg.node.appendChild(xmlBody);
      } else {
         xmlMsg.c('body').t(body);
      }

      // @TODO call pre send hook

      this.connection.send(xmlMsg);
   }

   public sendPresence(state = 'online') {
      if (this.connection.disco) {
         this.connection.disco.addIdentity('client', 'web', 'JSXC');
         this.connection.disco.addFeature(Strophe.NS.DISCO_INFO);
         this.connection.disco.addFeature(Strophe.NS.RECEIPTS);
      }

      var presenceStanza = $pres();

      if (this.connection.caps) {
         presenceStanza.c('c', this.connection.caps.generateCapsAttrs()).up();
      }

      if (state && state !== 'online') {
         presenceStanza.c('show').t(state).up();
      }

      var priority = Options.get('priority');
      if (priority && typeof priority[state] !== 'undefined' && parseInt(priority[state]) !== 0) {
         presenceStanza.c('priority').t(priority[state]).up();
      }

      Log.debug('Send presence', presenceStanza.toString());
      this.connection.send(presenceStanza);
   }

   public hasFeatureByJid(jid:JID, feature:string);
   public hasFeatureByJid(jid:JID, feature:string[]);
   public hasFeatureByJid() {

   }

   public getAvatar(jid:JID) {
      return this.loadVcard(jid).then(function(vcard){
         return new Promise(function(resolve, reject){
            if (vcard.PHOTO && vcard.PHOTO.src) {
               resolve(vcard.PHOTO);
            } else {
               reject();
            }
         });
      });
   }

   public logout() {

   }

   public getRoster() {
      let self = this;
      let iq = $iq({
         type: 'get'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      });

      return new Promise(function(resolve, reject){
         self.connection.sendIQ(iq, function(){
            let returnValue = onRoster.apply(this, arguments);

            resolve();

            return returnValue;
         });
      });
   }

   private addContactToRoster(jid:JID, alias:string) {
      var iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      }).c('item', {
         jid: jid.full,
         name: alias || ''
      });

      return new Promise(function(resolve, reject){
         this.connection.sendIQ(iq, resolve, reject);
      });
   }

   private sendSubscriptionRequest(jid:JID) {
      // send subscription request to buddy (trigger onRosterChanged)
      this.connection.send($pres({
         to: jid.full,
         type: 'subscribe'
      }));
   }

   private parseVcard(stanza) {
      let data:any = {};
      let vcard = $(stanza).find('vCard');

      if (!vcard.length) {
         return data;
      }

      return this.parseVcardChildren(vcard);
   }

   private parseVcardChildren(stanza) {
      let data:any = {};
      let children = stanza.children();

      children.each(function(){
         let item = $(this);
         let children = item.children();
         let itemName = item[0].tagName;
         let value = null;

         if (itemName === 'PHOTO') {
            let img = item.find('BINVAL').text();
            let type = item.find('TYPE').text();
            let src = 'data:' + type + ';base64,' + img;

            if (item.find('EXTVAL').length > 0) {
               src = item.find('EXTVAL').text();
            }

            // concat chunks
            src = src.replace(/[\t\r\n\f]/gi, '');

            value = {
               type: type,
               src: src
            };
         } else if (children.length > 0) {
            value = this.parseVcardChildren(children);
         } else {
            value = item.text();
         }

         data[itemName] = value;
      });

      return data;
   }
}
