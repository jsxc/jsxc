import JID from '../../JID'
import { IConnection } from '../Connection.interface'
import * as NS from './namespace'
import XMPPHandler from './handler'
import Log from '../../util/Log'
import Account from '../../Account'
import { AbstractConnection, Presence, STANZA_IQ_KEY, STANZA_KEY } from '../AbstractConnection'
import XMPPJingleHandler from './JingleHandler'
import Client from '../../Client'

export default class XMPPConnection extends AbstractConnection implements IConnection {
   private handler: XMPPHandler;

   constructor(account: Account, protected connection) {
      super(account);

      this.handler = new XMPPHandler(account, connection);
      this.handler.registerHandler();
      NS.register('METADATA_NOTIFY', 'urn:xmpp:avatar:metadata+notify');

      this.processPendingStorageConnections();
      this.listenToStorageConnections();

      Client.getPresenceController().registerTargetPresenceHook(this.targetPresenceHandler);
   }

   private processPendingStorageConnections() {
      let storage = this.getStorage();
      let pendingStanzaItems = storage.getItemsWithKeyPrefix(STANZA_KEY);
      let pendingStanzaIQItems = storage.getItemsWithKeyPrefix(STANZA_IQ_KEY);

      for (let key in pendingStanzaItems) {
         this.onIncomingStorageStanza(key, pendingStanzaItems[key]);
      }

      for (let key in pendingStanzaIQItems) {
         this.onIncomingStorageStanzaIQ(key, pendingStanzaIQItems[key]);
      }
   }

   private listenToStorageConnections() {
      this.getStorage().registerHook(STANZA_KEY, (newValue, oldValue, key) => {
         if (newValue && !oldValue) {
            this.onIncomingStorageStanza(key, newValue);
         }
      });

      this.getStorage().registerHook(STANZA_IQ_KEY, (newValue, oldValue, key) => {
         if (newValue && !oldValue) {
            this.onIncomingStorageStanzaIQ(key, newValue);
         }
      });
   }

   private targetPresenceHandler = (presence: Presence) => {
      if (presence === Presence.offline) {
         this.connection.disconnect('forced');
      } else {
         this.account.getConnection().sendPresence(presence);
      }
   }

   public registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string) {
      this.connection.addHandler.apply(this.connection, arguments);
   }

   public pause() {
      this.connection.pause();
   }

   public close() {
      Client.getPresenceController().unregisterTargetPresenceHook(this.targetPresenceHandler);
   }

   public getJingleHandler() {
      if (!this.jingleHandler) {
         this.jingleHandler = new XMPPJingleHandler(this.account, this);
      }

      return this.jingleHandler;
   }

   public getCapabilitiesByJid(jid: JID): any {
      Log.error('Deprecated function called: getCapabilitiesByJid');
   };

   public hasFeatureByJid(jid: JID, feature: string);
   public hasFeatureByJid(jid: JID, feature: string[]);
   public hasFeatureByJid() {

   }

   public logout() {

   }

   public send(stanzaElement: Element);
   public send(stanzaElement: Strophe.Builder);
   public send() {
      this.connection.send(arguments[0]);
   }

   public sendIQ(stanzaElement: Element): Promise<Element>;
   public sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;
   public sendIQ() {
      let stanzaElement = arguments[0];

      return new Promise((resolve, reject) => {
         this.connection.sendIQ(stanzaElement, resolve, reject);
      });
   }

   private onIncomingStorageStanza(key: string, stanzaString: string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');
         return;
      }

      this.send(stanzaElement);

      this.getStorage().removeItem(key);
   }

   private onIncomingStorageStanzaIQ(key: string, stanzaString: string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');

         return;
      }

      this.sendIQ(stanzaElement).then((stanza: HTMLElement) => {
         this.getStorage().setItem(key, {
            type: 'success',
            stanza: stanza.outerHTML
         });
      }).catch((stanza) => {
         this.getStorage().setItem(key, {
            type: 'error',
            stanza: stanza.outerHTML
         });
      }).then(() => {
         this.getStorage().removeItem(key);
      });
   }
}
