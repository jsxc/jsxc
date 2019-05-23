import { IContact } from './Contact.interface';
import { IJID } from './JID.interface';
import ContactManager from './ContactManager';

export default abstract class ContactProvider {
   public abstract getUid(): string

   public abstract load(): Promise<IContact[]>

   public abstract add(contact: IContact): Promise<boolean>

   public abstract createContact(jid: IJID, name?: string): IContact
   public abstract createContact(id: string): IContact

   public abstract deleteContact(jid: IJID): Promise<void>

   constructor(protected contactManager: ContactManager) {

   }
}
