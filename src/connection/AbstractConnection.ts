import Message from '../Message'
import JID from '../JID'
import { IJID } from '../JID.interface'
import * as NS from './xmpp/namespace'
import Log from '../util/Log'
import { Strophe, $iq, $msg, $pres } from '../vendor/Strophe'
import Account from '../Account'
import Pipe from '../util/Pipe'
import PEPService from './services/PEP'
import MUCService from './services/MUC'
import RosterService from './services/Roster'
import VcardService from './services/Vcard'
import DiscoService from './services/Disco'
import PersistentMap from '../util/PersistentMap'


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

   protected abstract send(stanzaElement: Element);
   protected abstract send(stanzaElement: Strophe.Builder);

   protected abstract sendIQ(stanzaElement: Element): Promise<Element>;
   protected abstract sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   public abstract registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string);

   protected jingleHandler;
   public abstract getJingleHandler();

   protected node = 'https://jsxc.org';

   protected services = { pubSub: null, pep: null };

   constructor(protected account: Account) {

      let discoInfo = this.account.getDiscoInfo();

      discoInfo.addIdentity('client', 'web', 'JSXC');

      NS.register('VCARD', 'vcard-temp');
      NS.register('FORWARD', 'urn:xmpp:forward:0');
   }

   public getPEPService = (): PEPService => {
      return this.getService(PEPService);
   }

   public getMUCService = (): MUCService => {
      return this.getService(MUCService);
   }

   public getRosterService = (): RosterService => {
      return this.getService(RosterService);
   }

   public getVcardService = (): VcardService => {
      return this.getService(VcardService);
   }

   public getDiscoService = (): DiscoService => {
      return this.getService(DiscoService);
   }

   private getService(Service) {
      if (Service.name.match(/^default/)) {
         Log.debug('Every service needs a unique class name');
      }

      if (!this.services[Service.name]) {
         let self = this;

         this.services[Service.name] = new Service(function() {
            return self.send.apply(self, arguments)
         }, function() {
            return self.sendIQ.apply(self, arguments)
         }, this, this.account);
      }

      return this.services[Service.name];
   }

   public pluginOnlySend(stanzaElement: Element);
   public pluginOnlySend(stanzaElement: Strophe.Builder);
   public pluginOnlySend(stanzaElement) {
      this.send(stanzaElement);
   }

   public pluginOnlySendIQ(stanzaElement: Element): Promise<Element>;
   public pluginOnlySendIQ(stanzaElement: Strophe.Builder): Promise<Element>;
   public pluginOnlySendIQ(stanzaElement) {
      return this.sendIQ(stanzaElement);
   }

   public getJID(): JID {
      return this.account.getJID();
   }

   public getSessionId() {
      //@REVIEW this should be handled differently; duplicate Connector
      let connectionParameters = new PersistentMap(this.account.getStorage(), 'connection');
      let sessionId = connectionParameters.get('sid') || null;

      //@TODO return session id only if connected

      return sessionId;
   }

   public sendMessage(message: Message) {
      if (message.getDirection() !== Message.DIRECTION.OUT) {
         return;
      }

      let xmlMsg = $msg({
         to: message.getPeer().full,
         type: message.getType(),
         id: message.getAttrId()
      });

      let htmlMessage;

      //@TODO html and plaintext is the same -> dry
      if (message.isEncrypted() && message.getEncryptedHtmlMessage()) {
         htmlMessage = message.getEncryptedHtmlMessage();
      } else if (message.getHtmlMessage()) {
         if (!message.isEncrypted()) {
            htmlMessage = message.getHtmlMessage();
         } else {
            Log.warn('This Html message should be encrypted');
         }
      }

      if (htmlMessage) {
         xmlMsg.c('html', {
            xmlns: Strophe.NS.XHTML_IM
         }).c('body', {
            xmlns: Strophe.NS.XHTML
         }).h(htmlMessage).up().up();
      }

      let plaintextMessage;

      if (message.isEncrypted() && message.getEncryptedPlaintextMessage()) {
         plaintextMessage = message.getEncryptedPlaintextMessage();
      } else if (message.getPlaintextMessage()) {
         if (!message.isEncrypted()) {
            plaintextMessage = message.getPlaintextMessage();
         } else {
            Log.warn('This plaintext message should be encrypted');
         }
      }

      if (plaintextMessage) {
         xmlMsg.c('body').t(plaintextMessage).up();
      }

      xmlMsg.c('origin-id', {
         xmlns: 'urn:xmpp:sid:0',
         id: message.getUid()
      }).up();

      let pipe = Pipe.get('preSendMessageStanza');
      pipe.run(message, xmlMsg).then(([message, xmlMsg]) => {
         if (message.hasAttachment() && !message.getAttachment().isProcessed()) {
            Log.warn('Attachment was not processed');
            //@TODO inform user
         }

         this.send(xmlMsg);
      }).catch(err => {
         Log.warn('Error during preSendMessageStanza pipe:', err);
      });
   }

   public sendPresence(presence?: Presence) {
      var presenceStanza = $pres();

      presenceStanza.c('c', this.generateCapsAttributes()).up();

      if (typeof presence !== 'undefined' && presence !== Presence.online) {
         presenceStanza.c('show').t(Presence[presence]).up();
      }

      // var priority = Options.get('priority');
      // if (priority && typeof priority[status] !== 'undefined' && parseInt(priority[status]) !== 0) {
      //    presenceStanza.c('priority').t(priority[status]).up();
      // }

      Log.debug('Send presence', presenceStanza.toString());

      this.send(presenceStanza);
   }

   public queryArchive(archive: JID, queryId: string, beforeResultId?: string, end?: Date): Promise<Element> {
      var iq = $iq({
         type: 'set'
      });

      iq.c('query', {
         xmlns: NS.get('MAM'),
         queryid: queryId
      });

      iq.c('x', {
         xmlns: 'jabber:x:data',
         type: 'submit'
      });

      iq.c('field', {
         'var': 'FORM_TYPE',
         type: 'hidden'
      }).c('value').t(NS.get('MAM')).up().up();

      iq.c('field', {
         'var': 'with'
      }).c('value').t(archive.bare).up().up();

      if (end) {
         iq.c('field', {
            'var': 'end'
         }).c('value').t(end.toISOString()).up().up();
      }

      iq.up().c('set', {
         xmlns: 'http://jabber.org/protocol/rsm'
      }).c('max').t('20').up();

      if (typeof beforeResultId === 'string') {
         iq.c('before').t(beforeResultId);
      }

      iq.up();

      return this.sendIQ(iq);
   }

   public close() {

   }

   private generateCapsAttributes() {
      return {
         'xmlns': NS.get('CAPS'),
         'hash': 'sha-1',
         'node': this.node,
         'ver': this.account.getDiscoInfo().getCapsVersion()
      }
   }
}

export { AbstractConnection, Presence };
