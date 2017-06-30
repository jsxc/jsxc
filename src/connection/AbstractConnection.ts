import Message from '../Message'
import JID from '../JID'
import * as NS from './xmpp/namespace'
import onRoster from './xmpp/handlers/roster'
import Log from '../util/Log'
import * as StropheLib from 'strophe.js'

let Strophe = StropheLib.Strophe;
let $iq = StropheLib.$iq;
let $msg = StropheLib.$msg;
let $pres = StropheLib.$pres;

enum Presence {
   online,
   chat,
   away,
   xa,
   dnd,
   offline
}

abstract class AbstractConnection {
   protected abstract connection;

   protected abstract send(stanzaElement:Element);
   protected abstract send(stanzaElement:Strophe.Builder);

   protected abstract sendIQ(stanzaElement:Element):Promise<{}>;
   protected abstract sendIQ(stanzaElement:Strophe.Builder):Promise<{}>;

   public getRoster() {
      let iq = $iq({
         type: 'get'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      });

      //@TODO use account.getStorage().getItem('roster', 'version'), maybe better as parameter

      return this.sendIQ(iq).then(function() {
         return onRoster.apply(this, arguments);
      });
   }

   public sendMessage(message:Message) {
      // @TODO pipes

      if (message.getDirection() !== Message.DIRECTION.OUT) {
         return;
      }

      let xmlMsg = $msg({
         to: message.getPeer().full,
         type: message.getTypeString(),
         id: message.getId()
      });

      if (message.getHtmlMessage()) {
         xmlMsg.c('html', {
            xmlns: Strophe.NS.XHTML_IM
         }).c('body', {
            xmlns: Strophe.NS.XHTML
         }).h(message.getHtmlMessage()).up();
      }

      if (message.getPlaintextMessage()) {
         xmlMsg.c('body').t(message.getPlaintextMessage()).up();
      }

      // @TODO call pre send hook

      this.send(xmlMsg);
   }

   public sendPresence(presence?:Presence) {
      if (this.connection.disco) {
         this.connection.disco.addIdentity('client', 'web', 'JSXC');
         this.connection.disco.addFeature(NS.get('DISCO_INFO'));
         this.connection.disco.addFeature(NS.get('RECEIPTS'));
      }

      var presenceStanza = $pres();

      if (this.connection.caps) {
         presenceStanza.c('c', this.connection.caps.generateCapsAttrs()).up();
      }

      if (presence !== Presence.online) {
         presenceStanza.c('show').t(Presence[presence]).up();
      }

      // var priority = Options.get('priority');
      // if (priority && typeof priority[status] !== 'undefined' && parseInt(priority[status]) !== 0) {
      //    presenceStanza.c('priority').t(priority[status]).up();
      // }

      Log.debug('Send presence', presenceStanza.toString());

      this.send(presenceStanza);
   }

   public removeContact(jid:JID) {
      let self = this;

      // Shortcut to remove buddy from roster and cancle all subscriptions
      let iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: NS.get('ROSTER')
      }).c('item', {
         jid: jid.bare,
         subscription: 'remove'
      });

      return this.sendIQ(iq);
   }

   public addContact(jid:JID, alias:string) {
      let waitForRoster = this.addContactToRoster(jid, alias);

      this.sendSubscriptionRequest(jid);

      return waitForRoster;
   };

   public loadVcard(jid:JID) {
      let iq = $iq({
         type: 'get',
         to: jid.full
      }).c('vCard', {
         xmlns: NS.get('VCARD')
      });

      //@TODO register Namespace 'VCARD', 'vcard-temp'

      return this.sendIQ(iq).then(this.parseVcard);
   }

   public getAvatar(jid:JID) {
      return this.loadVcard(jid).then(function(vcard) {
         return new Promise(function(resolve, reject){
            if (vcard.PHOTO && vcard.PHOTO.src) {
               resolve(vcard.PHOTO);
            } else {
               reject();
            }
         });
      });
   }

   public setDisplayName(jid:JID, displayName:string) {
      var iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      }).c('item', {
         jid: jid.bare,
         name: displayName
      });

      this.sendIQ(iq);
   }

   public sendSubscriptionAnswer(to:JID, accept:boolean) {
      let presenceStanza = $pres({
         to: to.bare,
         type: (accept) ? 'subscribed' : 'unsubscribed'
      });

      this.send(presenceStanza);
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

      return this.sendIQ(iq);
   }

   private sendSubscriptionRequest(jid:JID) {
      // send subscription request to buddy (trigger onRosterChanged)
      this.send($pres({
         to: jid.full,
         type: 'subscribe'
      }));
   }

   private parseVcard = (stanza) => {
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

export {AbstractConnection, Presence};
