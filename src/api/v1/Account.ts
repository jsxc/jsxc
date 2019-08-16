import Account from '@src/Account';
import Client from '@src/Client';
import MultiUserContact from '@src/MultiUserContact';
import JID from '@src/JID';
import { IContact } from '@src/Contact.interface';
import { IJID } from '@src/JID.interface';

class ContactWrapper {
   constructor(protected contact: IContact, protected account: Account) {

   }

   public getUid() {
      return this.contact.getUid();
   }

   public getJid() {
      return this.contact.getJid();
   }

   public openChatWindow() {
      this.contact.getChatWindowController().open();
   }

   public openChatWindowProminently() {
      this.contact.getChatWindowController().openProminently();
   }

   public addToContactList() {
      this.account.getContactManager().add(this.contact);
   }
}

class MultiUserContactWrapper extends ContactWrapper {
   protected contact: MultiUserContact;

   public join() {
      this.contact.join();
   }

   public leave() {
      return this.contact.leave();
   }

   public destroy() {
      return this.contact.destroy();
   }
}

export default class {
   private account: Account;

   constructor(uid: string) {
      let account = Client.getAccountManager().getAccount(uid);

      if (!account) {
         throw new Error(`Account with uid "${uid}" doesn't exist.`);
      }

      this.account = account;
   }

   public createMultiUserContact(jidString: string, nickname: string, displayName?: string, password?: string) {
      let jid = new JID(jidString);

      if (!jid.node || !jid.domain) {
         throw new Error('You have to provide a full jid');
      }

      let contactManager = this.account.getContactManager();

      if (contactManager.getContact(jid)) {
         throw new Error('Contact with this jid already exists');
      }

      let contact = new MultiUserContact(this.account, jid, displayName);

      contact.setNickname(nickname);
      contact.setBookmark(true);
      contact.setAutoJoin(true);

      if (password) {
         contact.setPassword(password);
      }

      contactManager.addToCache(contact);

      return new MultiUserContactWrapper(contact, this.account);
   }

   public getContact(jid: IJID) {
      let contact = this.account.getContact(jid);

      if (contact.isGroupChat()) {
         return new MultiUserContactWrapper(contact, this.account);
      }

      return new ContactWrapper(contact, this.account);
   }
}
