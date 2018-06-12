import JID from '../../JID'
import Message from '../../Message'
import Options from '../../Options'
import * as CONST from '../../CONST'
import { IConnection } from '../Connection.interface'
import * as NS from './namespace'
import XMPPHandler from './handler'
import Log from '../../util/Log'
import Account from '../../Account'
import { AbstractConnection, Presence } from '../AbstractConnection'
import Roster from '../../ui/Roster'
import XMPPJingleHandler from './JingleHandler'
import Client from '../../Client'

export default class XMPPConnection extends AbstractConnection implements IConnection {
   private handler;

   constructor(account: Account, protected connection) {
      super(account);

      this.handler = new XMPPHandler(account, connection);
      this.handler.registerHandler();
      NS.register('METADATA_NOTIFY', 'urn:xmpp:avatar:metadata+notify');

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

      Client.getPresenceController().registerTargetPresenceHook(this.targetPresenceHandler);
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

   public renameContact(jid: JID, name: string) {
      //@TODO maybe replace jid with contact?

      // if (d.type === 'chat') {
      //    var iq = $iq({
      //       type: 'set'
      //    }).c('query', {
      //       xmlns: NS.get('roster')
      //    }).c('item', {
      //       jid: jid.bare,
      //       name: name
      //    });
      //    this.connection.sendIQ(iq);
      // } else if (d.type === 'groupchat') {
      //    jsxc.xmpp.bookmarks.add(bid, newname, d.nickname, d.autojoin);
      // }
   }

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

   private onIncomingStorageStanza(stanzaString: string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');
         return;
      }

      this.send(stanzaElement);
   }

   private onIncomingStorageStanzaIQ(key: string, stanzaString: string) {
      let stanzaElement = new DOMParser().parseFromString(stanzaString, 'text/xml').documentElement

      if ($(stanzaElement).find('parsererror').length > 0) {
         Log.error('Could not parse stanza string from storage.');

         return;
      }

      this.sendIQ(stanzaElement).then((stanza: HTMLElement) => {
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
