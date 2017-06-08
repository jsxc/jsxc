import JID from '../../JID';
import Message from '../../Message';
import Options from '../../Options'
import * as CONST from '../../CONST';
import {IConnection} from '../ConnectionInterface';
import {Strophe} from 'strophe';
import * as NS from './namespace'
import XMPPHandler from './handler'
import Log from '../../util/Log'
import Account from '../../Account'
import AbstractConnection from '../AbstractConnection'

export default class XMPPConnection extends AbstractConnection implements IConnection {
   private handler;

   constructor(private account:Account, private connection:Strophe.Connection) {
      super();

      this.handler = new XMPPHandler(connection);
      this.handler.registerHandler();

      this.account.getStorage().registerHook('stanza', (newValue, oldValue, key) => {
         if (newValue && !oldValue) {
            this.onIncomingStorageStanza(newValue);

            this.account.getStorage().removeItem(key);
         }
      });

      this.account.getStorage().registerHook('stanzaIQ', (newValue, oldValue, key) => {
         if (newValue && !oldValue) {
            this.onIncomingStorageStanzaIQ(key, newValue);
         }
      });
   }

   public getCapabilitiesByJid(jid:JID):any {

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

   public hasFeatureByJid(jid:JID, feature:string);
   public hasFeatureByJid(jid:JID, feature:string[]);
   public hasFeatureByJid() {

   }

   public logout() {

   }

   protected send(stanzaElement:Element);
   protected send(stanzaElement:Strophe.Builder);
   protected send() {
      this.connection.send(arguments[0]);
   }

   protected sendIQ(stanzaElement:Element):Promise<{}>;
   protected sendIQ(stanzaElement:Strophe.Builder):Promise<{}>;
   protected sendIQ():Promise<{}> {
      let stanzaElement = arguments[0];

      return new Promise((resolve, reject) => {
         this.connection.sendIQ(stanzaElement, resolve, reject);
      });
   }

   private onIncomingStorageStanza(stanzaString:string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');
         return;
      }

      this.send(stanzaElement);
   }

   private onIncomingStorageStanzaIQ(key:string, stanzaString:string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');

         return;
      }

      this.sendIQ(stanzaElement).then((stanza) => {
         this.account.getStorage().setItem(key, {
            type: 'success',
            stanza: stanza.outerHTML
         });
      }).catch((stanza) => {
         this.account.getStorage().setItem(key, {
            type: 'error',
            stanza: stanza.outerHTML
         });
      });
   }
}
