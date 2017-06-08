import JID from '../../JID';
import Message from '../../Message';
import {IConnection} from '../ConnectionInterface';
import Log from '../../util/Log'
import Account from '../../Account'
import AbstractConnection from '../AbstractConnection'

export default class StorageConnection extends AbstractConnection implements IConnection {

   protected connection:any = {};

   constructor(private account: Account) {
      super();
window.storageConnection = this;
      this.connection = {
         jid: account.getJID().full,
         send: this.send,
         sendIQ: (elem, success, error) => {
            this.sendIQ(elem).then(success).catch(error);
         },
         addHandler: () => {}
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

   protected send(stanzaElement: Element);
   protected send(stanzaElement: Strophe.Builder);
   protected send() {
      let storage = this.account.getStorage();
      let stanzaString = this.stanzaElementToString(arguments[0]);
      let key = storage.generateKey(
         'stanza',
         stanzaString.length + '',
         new Date().getTime() + ''
      );

      storage.setItem(key, stanzaString);
   }

   protected sendIQ(stanzaElement:Element):Promise<{}>;
   protected sendIQ(stanzaElement:Strophe.Builder):Promise<{}>;
   protected sendIQ():Promise<{}> {
      let storage = this.account.getStorage();
      let stanzaString = this.stanzaElementToString(arguments[0]);
      let key = storage.generateKey(
         'stanzaIQ',
         stanzaString.length + '',
         new Date().getTime() + ''
      );

      storage.setItem(key, stanzaString);

      return new Promise(function(resolve, reject) {
         storage.registerHook(key, function(newValue) { console.log('got an answer', newValue)
            storage.removeItem(key);

            if (newValue.type === 'success') {
               resolve(newValue.stanza);
            } else if (newValue.type === 'error') {
               reject(newValue.stanza);
            }
         });
      });
   }

   private stanzaElementToString(stanzaElement: Element):string;
   private stanzaElementToString(stanzaElement: Strophe.Builder):string;
   private stanzaElementToString() {
      let stanzaString: string;
      let stanzaElement = arguments[0] || {};

      if (typeof stanzaElement.innerHTML === 'string') {
         stanzaString = stanzaElement.innerHTML;
      } else {
         stanzaString = stanzaElement.toString();
      }

      return stanzaString;
   }
}
