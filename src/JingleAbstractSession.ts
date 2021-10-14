import Account from './Account';
import JID from './JID';
import { IContact } from 'Contact.interface';
import ChatWindow from '@ui/ChatWindow';
import IStorage from './Storage.interface';
import { IOTalkJingleSession, OTalkEventNames, IEndReason } from '@vendor/Jingle.interface';

export const JINGLE_FEATURES = {
   screen: ['urn:xmpp:jingle:transports:ice-udp:1', 'urn:xmpp:jingle:apps:dtls:0'],
   audio: [],
   video: [],
};
JINGLE_FEATURES.audio = [...JINGLE_FEATURES.screen, 'urn:xmpp:jingle:apps:rtp:audio'];
JINGLE_FEATURES.video = [...JINGLE_FEATURES.audio, 'urn:xmpp:jingle:apps:rtp:video'];

export default abstract class JingleAbstractSession {
   protected storage: IStorage;

   protected peerJID: JID;
   protected peerContact: IContact;
   protected peerChatWindow: ChatWindow;

   public abstract getMediaRequest(): string[];
   public abstract onOnceIncoming();
   protected abstract onIncoming();

   constructor(protected account: Account, protected session: IOTalkJingleSession) {
      this.storage = this.account.getStorage();

      this.peerJID = new JID(session.peerID);
      this.peerContact = this.account.getContact(this.peerJID);
      this.peerChatWindow = this.peerContact.getChatWindow();

      if (!this.session.isInitiator) {
         this.onIncoming();
      }
   }

   public getId() {
      return this.session.sid;
   }

   public getPeer() {
      return this.peerContact;
   }

   public getCallType(): 'audio' | 'video' | 'stream' {
      let mediaRequested = this.getMediaRequest();

      if (mediaRequested.includes('video')) {
         return 'video';
      }

      if (mediaRequested.length === 0) {
         return 'stream';
      }

      return 'audio';
   }

   public on(eventName: OTalkEventNames | 'adopt', handler: (data: any) => void) {
      this.session.on(<any>eventName, (session, data) => handler(data));
   }

   public cancel(): void {
      this.session.cancel();
   }

   public decline(): void {
      this.session.decline();
   }

   public end(reason?: string | IEndReason, silent?: boolean): void {
      this.session.end(reason, silent);
   }
}
