import Log from './util/Log'
import Account from './Account'
import JID from './JID'
import JingleCallSession from './JingleCallSession'

export default abstract class JingleAbstractSession {
   protected storage;

   protected peerJID:JID;
   protected peerContact;
   protected peerChatWindow;

   public abstract onOnceIncoming();
   protected abstract onIncoming();

   constructor(protected account:Account, protected session) {
      this.storage = this.account.getStorage();

      this.peerJID = new JID(session.peerID);
      this.peerContact = this.account.getContact(this.peerJID);
      this.peerChatWindow = this.account.openChatWindow(this.peerContact);

      if (!this.session.initiator) {
         this.onIncoming();
      }
   }

   public getId() {
      return this.session.sid;
   }

   public on(eventName:string, handler) {
      this.session.on(eventName, handler);
   }
}
