import JID from '../../JID'
import { IConnection } from '../Connection.interface'
import Log from '../../util/Log'
import Account from '../../Account'
import { AbstractConnection, Presence } from '../AbstractConnection'
import * as StropheLib from 'strophe.js'
import JingleHandler from '../JingleHandler'

let Strophe = StropheLib.Strophe;

export default class StorageConnection extends AbstractConnection implements IConnection {

   protected connection: any = {};

   private handlers = [];

   constructor(protected account: Account) {
      super(account);

      this.connection = {
         jid: account.getJID().full,
         send: this.send,
         sendIQ: (elem, success, error) => {
            this.sendIQ(elem).then(success).catch(error);
         },
         addHandler: () => { }
      }

      for (var k in (<any>Strophe)._connectionPlugins) {
         if ((<any>Strophe)._connectionPlugins.hasOwnProperty(k)) {
            var ptype = (<any>Strophe)._connectionPlugins[k];
            // jslint complaints about the below line, but this is fine
            var F = function() { }; // jshint ignore:line
            F.prototype = ptype;
            this.connection[k] = new F();
            this.connection[k].init(this.connection);
         }
      }

      this.account.getStorage().registerHook('stanzaJingle', this.storageJingleHook);
   }

   public registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string) {
      this.handlers.push(arguments);
   }

   public getHandlers() {
      return this.handlers;
   }

   public getJingleHandler() {
      if (!this.jingleHandler) {
         this.jingleHandler = new JingleHandler(this.account, this);
      }

      return this.jingleHandler;
   }

   public getCapabilitiesByJid(jid: JID): any {
      Log.info('[SC] getCapabilitiesByJid');
   };

   public hasFeatureByJid(jid: JID, feature: string);
   public hasFeatureByJid(jid: JID, feature: string[]);
   public hasFeatureByJid() {
      Log.info('[SC] has feature by jid');
   }

   public logout() {
      Log.info('[SC] logout');
   }

   public send(stanzaElement: Element);
   public send(stanzaElement: Strophe.Builder);
   public send() {
      let storage = this.account.getStorage();
      let stanzaString = this.stanzaElementToString(arguments[0]);
      let key = storage.generateKey(
         'stanza',
         stanzaString.length + '',
         new Date().getTime() + ''
      );

      storage.setItem(key, stanzaString);
   }

   protected sendIQ(stanzaElement: Element): Promise<Element>;
   protected sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;
   protected sendIQ(): Promise<{}> {
      let storage = this.account.getStorage();
      let stanzaString = this.stanzaElementToString(arguments[0]);
      let key = storage.generateKey(
         'stanzaIQ',
         stanzaString.length + '',
         new Date().getTime() + ''
      );

      storage.setItem(key, stanzaString);

      return new Promise(function(resolve, reject) {
         storage.registerHook(key, function(newValue) {
            console.log('got an answer', newValue)
            storage.removeItem(key);

            if (newValue.type === 'success') {
               resolve(newValue.stanza);
            } else if (newValue.type === 'error') {
               reject(newValue.stanza);
            }
         });
      });
   }

   public close() {
      this.account.getStorage().removeHook('stanzaJingle', this.storageJingleHook);
   }

   private stanzaElementToString(stanzaElement: Element): string;
   private stanzaElementToString(stanzaElement: Strophe.Builder): string;
   private stanzaElementToString() {
      let stanzaString: string;
      let stanzaElement = arguments[0] || {};

      if (typeof stanzaElement.outerHTML === 'string') {
         stanzaString = stanzaElement.outerHTML;
      } else {
         stanzaString = stanzaElement.toString();
      }

      return stanzaString;
   }

   private storageJingleHook = (newValue, oldValue, key) => {
      if (newValue && !oldValue) {
         this.processJingleStanza(newValue);
      }
   }

   private processJingleStanza(stanzaString) {
      console.log('storage jingle stanza')
      let iqElement = $.parseXML(stanzaString).getElementsByTagName('iq')[0];

      this.getJingleHandler().onJingle(iqElement);
   }
}
