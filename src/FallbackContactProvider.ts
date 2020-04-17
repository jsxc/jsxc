import ContactProvider from './ContactProvider';
import { IContact } from './Contact.interface';
import { IJID } from './JID.interface';
import Contact from './Contact';
import Account from './Account';
import MultiUserContact from './MultiUserContact';
import ContactManager from './ContactManager';

export const FALLBACK_ID = 'fallback';

export default class FallbackContactProvider extends ContactProvider {
   constructor(protected contactManager: ContactManager, private account: Account) {
      super(contactManager);
   }

   public getUid(): string {
      return FALLBACK_ID;
   }

   public load(): Promise<IContact[]> {
      return Promise.resolve([]);
   }

   public add(contact: IContact): Promise<boolean> {
      return Promise.resolve(false);
   }

   public createContact(jid: IJID, name?: string): IContact
   public createContact(id: string): IContact
   public createContact() {
      if (typeof arguments[0] === 'string') {
         let contact = new Contact(this.account, arguments[0]);

         if (contact.isGroupChat()) {
            return new MultiUserContact(this.account, arguments[0]);
         } else {
            return contact;
         }
      }

      let contact = new Contact(this.account, arguments[0], arguments[1]);
      contact.setProvider(this);

      return contact;
   }

   public deleteContact(jid: IJID): Promise<void> {
      return Promise.resolve();
   }
}
