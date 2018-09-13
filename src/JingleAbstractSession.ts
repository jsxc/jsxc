import Account from './Account'
import JID from './JID'
import { IContact } from 'Contact.interface';
import ChatWindow from '@ui/ChatWindow';

const ADOPTED = 'adopted';

export default abstract class JingleAbstractSession {
   private adoptee: boolean = false;

   protected storage;

   protected peerJID: JID;
   protected peerContact: IContact;
   protected peerChatWindow: ChatWindow;

   public abstract getMediaRequest(): Array<string>;
   public abstract onOnceIncoming();
   protected abstract onIncoming();

   constructor(protected account: Account, protected session) {
      this.storage = this.account.getStorage();

      this.peerJID = new JID(session.peerID);
      this.peerContact = this.account.getContact(this.peerJID);
      this.peerChatWindow = this.peerContact.getChatWindow();

      this.storage.registerHook(this.session.sid, (newValue) => {
         if (newValue === ADOPTED && !this.adoptee) {
            session.emit('aborted');
         }
      });

      if (!this.session.initiator) {
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

   public on(eventName: string, handler) {
      this.session.on(eventName, handler);
   }
}
