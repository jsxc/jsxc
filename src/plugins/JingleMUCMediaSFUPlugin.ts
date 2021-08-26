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
import { IMediaSession } from '@src/MediaSession.interface';
import { io, Socket } from 'socket.io-client';
import IceServers from '@src/IceServers';
import { OTalkEventNames, IEndReason } from '@vendor/Jingle.interface';
import UserMedia from '@src/UserMedia';
import HookRepository from '@util/HookRepository';
import Client from '@src/Client';

/**
 * XEP-xxxx: Jingle Multi-User Chat Media SFU
 *
 */

const JMM = 'urn:xmpp:jingle-muc-media-sfu:0';

type Actions = 'propose' | 'retract' | 'accept' | 'reject';
type CallGenerator = AsyncGenerator<[IContact, string, string] | [IMediaSession]>;
type MediaType = 'video' | 'audio' | 'screen';

const MIN_VERSION = '4.1.0';
const MAX_VERSION = '99.0.0';

Namespace.register('JINGLE_MUC_MEDIA_SFU', JMM);

class MediaSession implements IMediaSession {
   private id = UUID.v4();
   private hooks = new HookRepository();

   constructor(private pc: RTCPeerConnection, private peer: IContact) {
      pc.ontrack = ev => {
         this.hooks.trigger('peerStreamAdded', ev.streams[0]);
      };

      pc.oniceconnectionstatechange = () => this.hooks.trigger('change:connectionState', pc.iceConnectionState);
   }

   getId(): string {
      return this.id;
   }

   getPeer(): IContact {
      return this.peer;
   }

   getCallType(): 'audio' | 'video' | 'stream' {
      return 'video';
   }

   on(eventName: OTalkEventNames | 'adopt', handler: (data: any) => void): void {
      // accepted, terminated, aborted
      this.hooks.registerHook(eventName, handler);
   }

   cancel(): void {
      this.pc.close();
   }

   decline(): void {
      this.pc.close();
   }

   end(reason?: string | IEndReason, silent?: boolean): void {
      this.pc.close();
   }

   onOnceIncoming(): void {}

   getMediaRequest(): ('audio' | 'video')[] {
      return [];
   }

   getRemoteStreams(): MediaStream[] {
      const stream = new MediaStream();
      const receivers = this.pc.getReceivers();

      receivers.forEach(function (sender) {
         stream.addTrack(sender.track);
      });

      return stream.getTracks() ? [stream] : [];
   }
}

class Room {
   private static socket: Socket | undefined;

   private static rooms: { [id: string]: Room } = {};

   public static getRoom(id: string, userId?: string) {
      if (!this.rooms[id]) {
         if (!userId) {
            throw new Error('User id not provided');
         }

         this.rooms[id] = new Room(id, userId);
      }

      if (userId && userId !== this.rooms[id].getUserId()) {
         throw new Error('Room was created with different user id');
      }

      return this.rooms[id];
   }

   private static getSocket(): Socket {
      if (!this.socket) {
         const experimentalSFUEndpoint = Client.getOption('experimentalSFUEndpoint') || 'ws://localhost:3000';

         this.socket = io(experimentalSFUEndpoint);

         this.socket.on('iceCandidate', ({ peerId, roomId, candidate }) => {
            this.rooms[roomId]?.onIceCandidate(peerId, candidate);
         });
      }

      return this.socket;
   }

   private rtcPeers: { [key: string]: RTCPeerConnection } = {};

   private constructor(private id: string, private userId: string) {}

   private onIceCandidate(peerId: string, iceCandidate: RTCIceCandidateInit) {
      const candidate = new RTCIceCandidate(iceCandidate);

      this.rtcPeers[peerId]?.addIceCandidate(candidate);
   }

   public getUserId(): string {
      return this.userId;
   }

   public join(): Promise<string[]> {
      return new Promise(resolve => {
         const socket = Room.getSocket();

         socket.emit('join', { roomId: this.id, name: this.userId }, participants => {
            resolve(participants);
         });
      });
   }

   public async provideStream(): Promise<RTCPeerConnection> {
      const socket = Room.getSocket();
      const stream = JingleHandler.getVideoDialog().getLocalStream();
      const iceServers = await IceServers.get();
      const rtcPeer = new RTCPeerConnection({ iceServers });

      stream.getTracks().forEach(track => rtcPeer.addTrack(track, stream));

      rtcPeer.getTransceivers().forEach(transceiver => (transceiver.direction = 'sendonly'));

      rtcPeer.onicecandidate = ev => {
         const { candidate } = ev;

         candidate && socket.emit('iceCandidate', { name: this.userId, candidate });
      };

      const offer = await rtcPeer.createOffer();

      rtcPeer.setLocalDescription(offer);

      rtcPeer.oniceconnectionstatechange = ev => (this.rtcPeers[this.userId] = rtcPeer);

      return new Promise((resolve, reject) => {
         socket.emit(
            'requestStream',
            {
               roomId: this.id,
               name: this.userId,
               src: this.userId,
               offer: offer.sdp,
            },
            sdpAnswer => {
               if (!sdpAnswer) {
                  reject(new Error('invalid SDP answer'));

                  return;
               }

               const answer = new RTCSessionDescription({
                  type: 'answer',
                  sdp: sdpAnswer,
               });

               if (rtcPeer.signalingState === 'closed') {
                  reject(new Error('Connection closed'));

                  return;
               }

               rtcPeer.setRemoteDescription(answer).then(() => {
                  resolve(rtcPeer);
               });
            }
         );
      });
   }

   public async requestStream(srcUserId: string): Promise<RTCPeerConnection> {
      const socket = Room.getSocket();

      const iceServers = await IceServers.get();
      const rtcPeer = new RTCPeerConnection({ iceServers });

      rtcPeer.addTransceiver('audio', {
         direction: 'recvonly',
      });

      rtcPeer.addTransceiver('video', {
         direction: 'recvonly',
      });

      rtcPeer.onicecandidate = ev => {
         const { candidate } = ev;

         candidate && socket.emit('iceCandidate', { name: srcUserId, candidate });
      };

      const offer = await rtcPeer.createOffer();

      rtcPeer.setLocalDescription(offer);

      this.rtcPeers[srcUserId] = rtcPeer;

      return new Promise((resolve, reject) => {
         socket.emit(
            'requestStream',
            {
               roomId: this.id,
               name: this.userId,
               src: srcUserId,
               offer: offer.sdp,
            },
            sdpAnswer => {
               const answer = new RTCSessionDescription({
                  type: 'answer',
                  sdp: sdpAnswer,
               });

               if (rtcPeer.signalingState === 'closed') {
                  reject(new Error('Connection closed'));

                  return;
               }

               rtcPeer.setRemoteDescription(answer).then(() => {
                  resolve(rtcPeer);
               });
            }
         );
      });
   }
}

export default class JingleMUCMediaSFUPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'jmucmsfu';
   }

   public static getName(): string {
      return 'Jingle MUC Media SFU';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-jmucmsfu-enable'),
         xeps: [],
      };
   }

   private calls: { [id: string]: Call } = {};

   private acceptHistory: { [id: string]: string[] } = {};

   private pendingOutgoingSessionIds: string[] = [];

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      if (!Client.getOption('experimentalSFUEndpoint')) {
         return;
      }

      this.pluginAPI.addFeature(JMM);

      this.pluginAPI.getConnection().registerHandler(this.onJingleMessageInitiation, null, 'message', null);

      this.pluginAPI.addGroupCallProcessor(this.groupCallProcessor, 40);

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
               this.onAcceptedIncomingCall(jid, sessionId, type);
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

   private async onAcceptedIncomingCall(roomJid: IJID, sessionId: string, type: CallType) {
      const videoDialog = JingleHandler.getVideoDialog();
      const stream = await UserMedia.request(type === 'video' ? ['audio', 'video'] : ['audio']);

      videoDialog.showVideoWindow(stream);

      const contact = this.pluginAPI.getContact(roomJid) as MultiUserContact;
      const myNickname = contact.getNickname();

      const room = Room.getRoom(sessionId, contact.getJid().bare + '/' + myNickname);

      await room.join();
      await room.provideStream();

      this.sendMessage(roomJid, sessionId, 'accept');

      for (const acceptedNickname of this.acceptHistory[sessionId]) {
         if (acceptedNickname === myNickname) {
            break;
         }

         const member = contact.getMember(acceptedNickname);

         this.requestVideo(sessionId, member.jid, new JID(contact.getJid().bare, acceptedNickname));
      }
   }

   private onJingleMessageInitiation = (stanza: string): boolean => {
      let stanzaElement = $(stanza);
      let element = stanzaElement.find(`[xmlns="${JMM}"]`);

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
            this.requestVideo(sessionId, member.jid, fromJid);
         }
      }

      return true;
   };

   private requestVideo(sessionId: string, realMemberJid: IJID, nicknameJid: IJID) {
      const videoDialog = JingleHandler.getVideoDialog();
      const peer = this.pluginAPI.getContact(realMemberJid);

      Room.getRoom(sessionId)
         .requestStream(nicknameJid.full)
         .then(pc => {
            const mediaSession = new MediaSession(pc, peer);

            videoDialog.addSession(mediaSession);
         })
         .catch(err => {
            this.pluginAPI.Log.warn(`Could not connect to ${realMemberJid.full}`, err);
         });
   }

   private groupCallProcessor = async (
      contact: IContact,
      type: MediaType,
      generator: CallGenerator
   ): Promise<[IContact, MediaType, CallGenerator]> => {
      let capableResources = await contact.getCapableResources(JMM);

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

      const eventGenerator = new EventGenerator<
         [peer: IContact, resource: string, sessionId: string] | [IMediaSession]
      >();
      const timeout = setTimeout(() => {
         eventGenerator.push([contact, undefined, undefined]);

         eventGenerator.done();
      }, 30 * 1000);

      const room = Room.getRoom(sessionId, contact.getJid().bare + '/' + (contact as MultiUserContact).getNickname());

      const hook = (data: { action: Actions; peerJid: string; jid: string }) => {
         clearTimeout(timeout);

         const peerContact = data.peerJid ? this.pluginAPI.getContact(new JID(data.peerJid)) : undefined;

         if (data.action === 'retract') {
            this.sendMessage(contact.getJid(), sessionId, 'retract');

            eventGenerator.done();
         } else if (data?.action === 'accept') {
            // request video
            room
               .requestStream(data.jid)
               .then(pc => {
                  const mediaSession = new MediaSession(pc, peerContact);

                  eventGenerator.push([mediaSession]);
               })
               .catch(err => {
                  this.pluginAPI.Log.warn(`Could not connect to ${data.jid}`, err);
               });
         } else if (data?.action === 'reject') {
            eventGenerator.push([peerContact, undefined, sessionId]);
         }

         if (this.pendingOutgoingSessionIds.includes(sessionId)) {
            this.pendingOutgoingSessionIds = this.pendingOutgoingSessionIds.filter(id => id !== sessionId);
         }
      };

      const storage = this.pluginAPI.getSessionStorage();
      storage.registerHook(sessionId, hook);

      await room.join();
      room.provideStream();

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
         xmlns: JMM,
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

         //@TODO add plaintext message (filter message on incoming side)
      }

      this.pluginAPI.send(xmlMsg);
   }
}
