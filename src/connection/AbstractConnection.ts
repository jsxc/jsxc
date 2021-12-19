import Message from '../Message';
import JID from '../JID';
import * as NS from './xmpp/namespace';
import Log from '../util/Log';
import { Strophe, $iq, $msg, $pres } from '../vendor/Strophe';
import Account from '../Account';
import PEPService from './services/PEP';
import SearchService from './services/Search';
import PubSubService from './services/PubSub';
import MUCService from './services/MUC';
import RosterService from './services/Roster';
import VcardService from './services/Vcard';
import DiscoService from './services/Disco';

export const STANZA_KEY = 'stanza';
export const STANZA_IQ_KEY = 'stanzaIQ';
export const STANZA_JINGLE_KEY = 'stanzaJingle';

enum Presence {
   online,
   chat,
   away,
   xa,
   dnd,
   offline,
}

type ExtensivePresence = { presence: Presence; status: string };

abstract class AbstractConnection {
   protected abstract connection;

   protected abstract send(stanzaElement: Element);
   protected abstract send(stanzaElement: Strophe.Builder);

   protected abstract sendIQ(stanzaElement: Element): Promise<Element>;
   protected abstract sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   public abstract registerHandler(
      handler: (stanza: string) => boolean,
      ns?: string,
      name?: string,
      type?: string,
      id?: string,
      from?: string
   );

   protected jingleHandler;
   public abstract getJingleHandler();

   protected node = 'https://jsxc.org';

   protected services = { pubSub: null, pep: null };

   constructor(protected account: Account) {
      let discoInfo = this.account.getDiscoInfo();

      discoInfo.addIdentity('client', 'web', 'JSXC');

      NS.register('VCARD', 'vcard-temp');
      NS.register('FORWARD', 'urn:xmpp:forward:0');
      NS.register('LMC', 'urn:xmpp:message-correct:0');
      NS.register('MR', 'urn:xmpp:message-retract:0');
      NS.register('MS', 'urn:xmpp:styling:0');
      NS.register('GELOC+', 'http://jabber.org/protocol/geoloc+notify');
      NS.register('NICK+', 'http://jabber.org/protocol/nick+notify');
   }

   public getPubSubService = (): PubSubService => {
      //@TODO connect? supported?
      return this.getService('pubsub', PubSubService);
   };

   public getPEPService = (): PEPService => {
      return this.getService('pep', PEPService);
   };

   public getSearchService = (): SearchService => {
      return this.getService('search', SearchService);
   };

   public getMUCService = (): MUCService => {
      return this.getService('muc', MUCService);
   };

   public getRosterService = (): RosterService => {
      return this.getService('roster', RosterService);
   };

   public getVcardService = (): VcardService => {
      return this.getService('vcard', VcardService);
   };

   public getDiscoService = (): DiscoService => {
      return this.getService('disco', DiscoService);
   };

   private getService(key: string, Service) {
      if (!this.services[key]) {
         let self = this;

         this.services[key] = new Service(
            function () {
               return self.send.apply(self, arguments);
            },
            function () {
               return self.sendIQ.apply(self, arguments);
            },
            this,
            this.account
         );
      }

      return this.services[key];
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

   public getServerJID(): JID {
      return new JID('', this.getJID().domain, '');
   }

   public sendRetractMessage(message: Message) {
      if (message.getDirection() !== Message.DIRECTION.OUT) {
         return;
      }

      let xmlMsg = $msg({
         to: message.getPeer().full,
         type: message.getType(),
         id: message.getAttrId(),
      });

      xmlMsg.c('body').t("This person attempted to retract a previous message, but it's unsupported by your client.").up();

      if (message.getRetractId()!=null)
      {
         xmlMsg.c('apply-to', {
             xmlns: 'urn:xmpp:fasten:0',
             id: message.getRetractId()
          }).c('retract',{
            xmlns: 'urn:xmpp:message-retract:0'
          }).up().up().c('fallback',{
            xmlns: 'urn:xmpp:fallback:0'
          }).up().c('store',{
            xmlns: 'urn:xmpp:hints'
          }).up();
      }

      let pipe = this.account.getPipe('preSendMessageStanza');
      pipe
         .run(message, xmlMsg)
         .then(([message, xmlMsg]: [Message, Element]) => {

            this.send(xmlMsg);

            message.transferred();
         })
         .catch(err => {
            message.aborted();

            Log.warn('Error during preSendMessageStanza pipe:', err);
         });
   }

   public sendMessage(message: Message) {
      if (message.getDirection() !== Message.DIRECTION.OUT) {
         return;
      }

      let xmlMsg = $msg({
         to: message.getPeer().full,
         type: message.getType(),
         id: message.getAttrId(),
      });

      let htmlMessage = this.getMessage(message, message.getEncryptedHtmlMessage, message.getHtmlMessage);

      if (htmlMessage) {
         xmlMsg
            .c('html', {
               xmlns: Strophe.NS.XHTML_IM,
            })
            .c('body', {
               xmlns: Strophe.NS.XHTML,
            })
            .cnode($(htmlMessage).get(0))
            .up()
            .up()
            .up();
      }

      let plaintextMessage = this.getMessage(
         message,
         message.getEncryptedPlaintextMessage,
         message.getPlaintextMessage
      );

      if (plaintextMessage) {
         xmlMsg.c('body').t(plaintextMessage).up();
      }

      if (message.getReplaceId()!=null)
      {
         xmlMsg.c('replace', {
             xmlns: 'urn:xmpp:message-correct:0',
             id: message.getReplaceId()
          }).up();
      }

      xmlMsg.c('origin-id', {
         xmlns: 'urn:xmpp:sid:0',
         id: message.getUid()
      }).up();

      let pipe = this.account.getPipe('preSendMessageStanza');
      pipe
         .run(message, xmlMsg)
         .then(([message, xmlMsg]: [Message, Element]) => {
            if (message.hasAttachment() && !message.getAttachment().isProcessed()) {
               Log.warn('Attachment was not processed');

               if (!message.getErrorMessage()) {
                  message.setErrorMessage('Attachment was not processed');
               }

               if (!message.getPlaintextMessage()) {
                  message.aborted();

                  return;
               }
            }

            this.send(xmlMsg);

            message.transferred();
         })
         .catch(err => {
            message.aborted();

            Log.warn('Error during preSendMessageStanza pipe:', err);
         });
   }

   private getMessage(message: Message, getEncryptedMessage: () => string, getMessage: () => string) {
      if (message.isEncrypted() && getEncryptedMessage.call(message)) {
         return getEncryptedMessage.call(message);
      } else if (getMessage.call(message)) {
         if (!message.isEncrypted()) {
            return getMessage.call(message);
         }

         Log.warn('This message should be encrypted');
      }
   }

   public async sendPresence(presence?: Presence, statusText?: string) {
      let presenceStanza = $pres();

      presenceStanza.c('c', this.generateCapsAttributes()).up();

      if (typeof presence !== 'undefined' && presence !== Presence.online) {
         presenceStanza.c('show').t(Presence[presence]).up();
      }

      if (statusText) {
         presenceStanza.c('status').t(statusText).up();
      }

      let avatarHash = '';

      try {
         const avatar = await this.account.getContact().getAvatar();

         avatarHash = avatar.getHash();
      } catch (err) {
         // we don't have an avatar
      }

      presenceStanza.c('x', { xmlns: 'vcard-temp:x:update' }).c('photo').t(avatarHash).up().up();

      Log.debug('Send presence', presenceStanza.toString());

      this.send(presenceStanza);
   }

   public queryArchive(
      archive: JID,
      version: string,
      queryId: string,
      contact?: JID,
      beforeResultId?: string,
      end?: Date
   ): Promise<Element> {
      let iq = $iq({
         type: 'set',
         to: archive.bare,
      });

      iq.c('query', {
         xmlns: version,
         queryid: queryId,
      });

      iq.c('x', {
         xmlns: 'jabber:x:data',
         type: 'submit',
      });

      iq.c('field', {
         var: 'FORM_TYPE',
         type: 'hidden',
      })
         .c('value')
         .t(version)
         .up()
         .up();

      if (contact) {
         iq.c('field', {
            var: 'with',
         })
            .c('value')
            .t(contact.bare)
            .up()
            .up();
      }

      if (end) {
         iq.c('field', {
            var: 'end',
         })
            .c('value')
            .t(end.toISOString())
            .up()
            .up();
      }

      iq.up()
         .c('set', {
            xmlns: 'http://jabber.org/protocol/rsm',
         })
         .c('max')
         .t('50')
         .up();

      if (typeof beforeResultId === 'string' || typeof beforeResultId === 'number') {
         iq.c('before').t(beforeResultId);
      }

      iq.up();

      return this.sendIQ(iq);
   }

   public queryArchiveSync(
      startDate: Date,
      archive: JID,
      version: string,
      queryId: string,
      withJID: string
   ): Promise<Element> {
      let iq = $iq({
         type: 'set',
         to: archive.bare,
      });

      iq.c('query', {
         xmlns: version,
         queryid: queryId,
      });

      iq.c('x', {
         xmlns: 'jabber:x:data',
         type: 'submit',
      });

      iq.c('field', {
         var: 'FORM_TYPE',
         type: 'hidden',
      })
         .c('value')
         .t(version)
         .up()
         .up();

      iq.c('field', {
         var: 'start',
      })
         .c('value')
         .t(startDate.toISOString())
         .up()
         .up();

     /* iq.c('field', {
         var: 'with',
      })
         .c('value')
         .t(withJID)
         .up()
         .up();*/

      iq.up()
         .c('set', {
            xmlns: 'http://jabber.org/protocol/rsm',
         });

      iq.up();

      return this.sendIQ(iq);
   }

   public changePassword(newPassword: string): Promise<Element> {
      let iq = $iq({
         type: 'set',
      });

      iq.c('query', {
         xmlns: 'jabber:iq:register',
      });

      iq.c('username').t(this.getJID().node).up();

      iq.c('password').t(newPassword);

      return this.sendIQ(iq);
   }

   protected getStorage() {
      return this.account.getSessionStorage();
   }

   private generateCapsAttributes() {
      return {
         xmlns: NS.get('CAPS'),
         hash: 'sha-1',
         node: this.node,
         ver: this.account.getDiscoInfo().getCapsVersion(),
      };
   }
}

export { AbstractConnection, Presence, ExtensivePresence };
