import Account from './Account'
import JID from './JID'
import { IContact } from 'Contact.interface';
import ChatWindow from '@ui/ChatWindow';
import IStorage from './Storage.interface';
import { IOTalkJingleSession, OTalkEventNames, IEndReason } from '@vendor/Jingle.interface';

const ADOPTED = 'adopted';

export default abstract class JingleAbstractSession {
   private adoptee: boolean = false;

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

      this.storage.registerHook(this.session.sid, (newValue) => {
         if (newValue === ADOPTED && !this.adoptee) {
            session.emit('aborted');
         }
      });

      if (!this.session.isInitiator) {
         this.onIncoming();
      }
   }

   public adopt() {
      this.adoptee = true;

      this.storage.setItem(this.getId(), ADOPTED);
      this.storage.removeItem(this.getId());
   }

   public getId() {
      return this.session.sid;
   }

   public getPeer() {
      return this.peerContact;
   }

   public on(eventName: OTalkEventNames, handler: (data: any) => void) {
      this.session.on(eventName, (session, data) => handler(data));
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
