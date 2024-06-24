import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import * as Namespace from '@connection/xmpp/namespace';
import { IContact } from '@src/Contact.interface';
import UUID from '@util/UUID';
import JID from '@src/JID';
import { Call } from '@src/Call';
import { CallState, CallType } from '@src/CallManager';
import { IJID } from '@src/JID.interface';
import * as NS from '../connection/xmpp/namespace';
/**
 * XEP-0353: Jingle Message Initiation
 *
 * @version: 0.3.1
 * @see: https://xmpp.org/extensions/xep-0353.html
 *
 */

const JMI = 'urn:xmpp:jingle-message:0';

type Actions = 'propose' | 'retract' | 'accept' | 'reject' | 'proceed';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

Namespace.register('JINGLE_MESSAGE_INITIATION', JMI);

export default class JingleMessageInitiationPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'jmi';
   }

   public static getName(): string {
      return 'Jingle Message Initiation';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-jmi-enable'),
         xeps: [
            {
               id: 'XEP-0353',
               name: 'Jingle Message Initiation',
               version: '0.3.1',
            },
         ],
      };
   }

   private calls: { [id: string]: Call } = {};

   private pendingOutgoingSessionIds: string[] = [];

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.pluginAPI.addFeature(JMI);

      this.pluginAPI.getConnection().registerHandler(this.onJingleMessageInitiation, null, 'message', null);

      this.pluginAPI.addCallProcessor(this.callProcessor);

      this.pluginAPI.addTerminateCallProcessor(this.terminateCallProcessor);

      this.pluginAPI
         .getSessionStorage()
         .registerHook('*', (value: { action: Actions; jid: string; type: CallType }, _, sessionId) => {
            if (!value || !value.action || !value.jid || !value.type) {
               return;
            }

            const jid = new JID(value.jid);
            const action = value.action;
            const type = value.type;
            const peer = this.pluginAPI.getContact(jid);

            if (!peer) {
               return;
            }

            const ownJID = this.pluginAPI.getConnection().getJID();

            if (action === 'propose') {
               this.calls[sessionId] = this.pluginAPI.getCallManager().onIncomingCall(type, sessionId, peer);

               this.calls[sessionId].getState().then(state => {
                  if (state === CallState.Accepted) {
                     this.sendMessage(ownJID.toBareJID(), sessionId, 'accept');

                     this.sendMessage(jid, sessionId, 'proceed');
                  } else if (state === CallState.Declined) {
                     this.sendMessage(ownJID.toBareJID(), sessionId, 'reject');

                     this.sendMessage(jid, sessionId, 'reject');
                  }
               });
            } else if (action === 'retract' || (action === 'accept' && jid.full !== ownJID.full)) {
               if (this.calls[sessionId]) {
                  this.calls[sessionId].abort();
               }
            }
         });
   }

   private onJingleMessageInitiation = (stanza: string): boolean => {
      let stanzaElement = $(stanza);
      let element = stanzaElement.find(`[xmlns="${JMI}"]`);

      if (element.length !== 1) {
         return true;
      }

      const action = element.prop('tagName')?.toString().toLowerCase();

      if (!['propose', 'retract', 'accept', 'reject', 'proceed'].includes(action)) {
         return true;
      }

      const fromAttribute = stanzaElement.attr('from');
      const fromJid = new JID(fromAttribute);
      const sessionId = element.attr('id');
      const contact = this.pluginAPI.getContact(fromJid);
      const toAttribute = stanzaElement.attr('to');
      const toJid = new JID(toAttribute);
      if (toJid.bare === fromJid.bare) {
         let forwardedStanza = $(stanza).find('forwarded' + NS.getFilter('FORWARD'));
         let carbonStanza = $(stanza).find('> ' + NS.getFilter('CARBONS'));

         if (forwardedStanza.length > 0 && carbonStanza.length > 0) {
            if (carbonStanza.get(0) !== forwardedStanza.parent().get(0)) {
               return true;
            }

            let carbonTagName = <string>carbonStanza.prop('tagName') || '';
            if (carbonTagName.toLowerCase() === 'sent') {
               return true; //dont accept message here, cause we dont want to ring on carbons sent out to others
            }
         }
      }

      if (!contact || !sessionId) {
         return true;
      }

      const requestedMedia = element
         .find('> description[xmlns="urn:xmpp:jingle:apps:rtp:1"]')
         .map((_, descElement) => $(descElement).attr('media'))
         .get();
      const type: CallType =
         requestedMedia.includes('video') && requestedMedia.includes('audio')
            ? 'video'
            : requestedMedia.includes('audio')
            ? 'audio'
            : 'stream';

      this.pluginAPI.getSessionStorage().setItem(sessionId, {
         action,
         jid: fromJid.full,
         type,
      });

      return true;
   };

   private callProcessor = async (
      contact: IContact,
      type: 'video' | 'audio' | 'screen',
      resources: string[],
      sessionId: string
   ): Promise<[IContact, 'video' | 'audio' | 'screen', string[], string]> => {
      let capableResources = await contact.getCapableResources(JMI);

      if (capableResources.length === 0 || sessionId) {
         return [contact, type, resources, sessionId];
      }

      sessionId = UUID.v4();

      const descriptions = [];

      if (type === 'video' || type === 'audio') {
         descriptions.push('audio');
      }

      if (type === 'video') {
         descriptions.push('video');
      }

      this.pendingOutgoingSessionIds.push(sessionId);

      this.sendMessage(contact.getJid().toBareJID(), sessionId, 'propose', descriptions);

      return new Promise(resolve => {
         const storage = this.pluginAPI.getSessionStorage();
         const hook = (data: { action: Actions; jid: string }) => {
            if (data.action === 'retract') {
               this.sendMessage(contact.getJid().toBareJID(), sessionId, 'retract');
            } else if (data?.action === 'proceed') {
               resolve([contact, type, [new JID(data.jid).resource], sessionId]);
            } else if (data?.action === 'reject') {
               resolve([contact, type, [], sessionId]);
            }

            if (data?.action !== 'propose') {
               storage.removeHook(sessionId, hook);
            }

            this.pendingOutgoingSessionIds = this.pendingOutgoingSessionIds.filter(id => id !== sessionId);
         };

         storage.registerHook(sessionId, hook);

         setTimeout(() => {
            resolve([contact, type, [], undefined]);
         }, 30 * 1000);
      });
   };

   private terminateCallProcessor = async (sessionId?: string): Promise<[string]> => {
      const ids = sessionId ? [sessionId] : [...this.pendingOutgoingSessionIds];
      const sessionStorage = this.pluginAPI.getSessionStorage();

      this.pendingOutgoingSessionIds = sessionId ? this.pendingOutgoingSessionIds.filter(id => id !== sessionId) : [];

      ids.forEach(id => {
         sessionStorage.setItem(id, { action: 'retract' });
      });

      return [sessionId];
   };

   private sendMessage(jid: IJID, sessionId: string, action: 'propose', descriptions?: ('audio' | 'video')[]): void;
   private sendMessage(jid: IJID, sessionId: string, action: 'retract' | 'accept' | 'proceed' | 'reject'): void;
   private sendMessage(jid: IJID, sessionId: string, action, descriptions = []) {
      let xmlMsg = $msg({
         to: jid.full,
      }).c(action, {
         xmlns: JMI,
         id: sessionId,
      });

      if (action === 'propose') {
         if (descriptions.includes('video') || descriptions.includes('audio')) {
            xmlMsg
               .c('description', {
                  xmlns: 'urn:xmpp:jingle:apps:rtp:1',
                  media: 'audio',
               })
               .up();
         }

         if (descriptions.includes('video')) {
            xmlMsg
               .c('description', {
                  xmlns: 'urn:xmpp:jingle:apps:rtp:1',
                  media: 'video',
               })
               .up();
         }
      }

      this.pluginAPI.send(xmlMsg);
   }
}
