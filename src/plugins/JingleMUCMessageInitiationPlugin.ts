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
import MultiUserContact from '@src/MultiUserContact';
import EventGenerator from '@util/EventGenerator';
import JingleHandler from '@connection/JingleHandler';

/**
 * XEP-xxxx: Jingle Multi-User Chat Message Initiation
 *
 */

const JMI = 'urn:xmpp:jingle-muc-message:0';

type Actions = 'propose' | 'retract' | 'accept' | 'reject';
type CallGenerator = AsyncGenerator<[IContact, string, string]>;
type MediaType = 'video' | 'audio' | 'screen';

const MIN_VERSION = '4.1.0';
const MAX_VERSION = '99.0.0';

Namespace.register('JINGLE_MUC_MESSAGE_INITIATION', JMI);

export default class JingleMUCMessageInitiationPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'jmucmi';
   }

   public static getName(): string {
      return 'Jingle MUC Message Initiation';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-jmucmi-enable'),
         xeps: [],
      };
   }

   private calls: { [id: string]: Call } = {};

   private acceptHistory: { [id: string]: string[] } = {};

   private pendingOutgoingSessionIds: string[] = [];

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.pluginAPI.addFeature(JMI);

      this.pluginAPI.getConnection().registerHandler(this.onJingleMessageInitiation, null, 'message', null);

      this.pluginAPI.addGroupCallProcessor(this.groupCallProcessor);

      this.pluginAPI.addTerminateCallProcessor(this.terminateCallProcessor);

      // plugin storage is namespaced, so we do not need to use another namespace
      this.pluginAPI.getSessionStorage().registerHook('*', this.onStorage);
   }

   private onStorage = (
      value: { action: Actions; jid: string; peerJid: string; type: CallType },
      _,
      sessionId: string
   ) => {
      if (!value || !value.action || !value.jid) {
         return;
      }

      const jid = new JID(value.jid);
      const peerJid = new JID(value.peerJid);
      const action = value.action;
      const type = value.type;
      const peer = this.pluginAPI.getContact(peerJid);

      if (!peer) {
         return;
      }

      if (action === 'propose') {
         if (!type) {
            return;
         }

         this.calls[sessionId] = this.pluginAPI.getCallManager().onIncomingCall(type, sessionId, peer);

         this.calls[sessionId].getState().then(state => {
            if (state === CallState.Accepted) {
               this.sendMessage(jid, sessionId, 'accept');
            } else if (state === CallState.Declined) {
               this.sendMessage(jid, sessionId, 'reject');
            }
         });
      } else if (action === 'retract') {
         if (this.calls[sessionId]) {
            this.calls[sessionId].abort();
         }
      }
   };

   private onJingleMessageInitiation = (stanza: string): boolean => {
      let stanzaElement = $(stanza);
      let element = stanzaElement.find(`[xmlns="${JMI}"]`);

      if (element.length !== 1) {
         return true;
      }

      const action = element.prop('tagName')?.toString().toLowerCase();

      if (!['propose', 'retract', 'accept', 'reject'].includes(action)) {
         return true;
      }

      const typeAttribute = stanzaElement.attr('type');
      const fromAttribute = stanzaElement.attr('from');
      const fromJid = new JID(fromAttribute);
      const sessionId = element.attr('id');
      const contact = this.pluginAPI.getContact(fromJid) as MultiUserContact;

      if (!contact || !sessionId || typeAttribute !== 'groupchat') {
         this.pluginAPI.Log.debug('No contact, sessionId, or type is not groupchat');

         return true;
      }

      const member = contact.getMember(fromJid.resource);

      if (!member.jid) {
         this.pluginAPI.Log.debug('No member jid', contact.getNickname(), member);

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

      if (contact.getNickname() !== fromJid.resource) {
         this.pluginAPI.getSessionStorage().setItem(sessionId, {
            action,
            jid: fromJid.full,
            peerJid: member.jid.full,
            type: action === 'propose' ? type : undefined,
         });
      }

      if (action === 'propose') {
         this.acceptHistory[sessionId] = [fromJid.resource];
      } else if (action === 'accept' && this.acceptHistory[sessionId]) {
         this.acceptHistory[sessionId].push(fromJid.resource);

         const myIndex = this.acceptHistory[sessionId].indexOf(contact.getNickname());
         const acceptIndex = this.acceptHistory[sessionId].indexOf(fromJid.resource);

         if (myIndex > 0 && acceptIndex > myIndex) {
            const videoDialog = JingleHandler.getVideoDialog();
            const peer = this.pluginAPI.getContact(member.jid);

            contact
               .getAccount()
               .getCallManager()
               .callSingleUser(
                  peer,
                  'video',
                  [member.jid.resource],
                  sessionId + ':' + UUID.v4(),
                  videoDialog.getLocalStream()
               )
               .then(callState => {
                  if (callState !== null && typeof callState === 'object') {
                     videoDialog.addSession(callState);
                  }
               })
               .catch(err => {
                  this.pluginAPI.Log.warn('Could not call ' + member.jid.full, err);
               });
         }
      }

      return true;
   };

   private groupCallProcessor = async (
      contact: IContact,
      type: MediaType,
      generator: CallGenerator
   ): Promise<[IContact, MediaType, CallGenerator]> => {
      let capableResources = await contact.getCapableResources(JMI);

      if (capableResources.length === 0 || generator) {
         return [contact, type, generator];
      }

      const sessionId = UUID.v4();

      const descriptions = [];

      if (type === 'video' || type === 'audio') {
         descriptions.push('audio');
      }

      if (type === 'video') {
         descriptions.push('video');
      }

      this.pendingOutgoingSessionIds.push(sessionId);

      const eventGenerator = new EventGenerator<[peer: IContact, resource: string, sessionId: string]>();
      const timeout = setTimeout(() => {
         eventGenerator.push([contact, undefined, undefined]);

         eventGenerator.done();
      }, 30 * 1000);

      const hook = (data: { action: Actions; peerJid: string; jid: string }) => {
         clearTimeout(timeout);

         const peerContact = data.peerJid ? this.pluginAPI.getContact(new JID(data.peerJid)) : undefined;

         if (data.action === 'retract') {
            this.sendMessage(contact.getJid(), sessionId, 'retract');

            eventGenerator.done();
         } else if (data?.action === 'accept') {
            eventGenerator.push([peerContact, new JID(data.peerJid).resource, sessionId + ':' + UUID.v4()]);
         } else if (data?.action === 'reject') {
            eventGenerator.push([peerContact, undefined, sessionId]);
         }

         if (this.pendingOutgoingSessionIds.includes(sessionId)) {
            this.pendingOutgoingSessionIds = this.pendingOutgoingSessionIds.filter(id => id !== sessionId);
         }
      };

      const storage = this.pluginAPI.getSessionStorage();
      storage.registerHook(sessionId, hook);

      this.sendMessage(contact.getJid(), sessionId, 'propose', descriptions);

      return [contact, type, eventGenerator.getGenerator()];
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
   private sendMessage(jid: IJID, sessionId: string, action: 'retract' | 'accept' | 'reject'): void;
   private sendMessage(jid: IJID, sessionId: string, action, descriptions = []) {
      let xmlMsg = $msg({
         to: jid.bare,
         type: 'groupchat',
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
