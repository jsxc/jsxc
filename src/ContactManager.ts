import ContactProvider from './ContactProvider';
import { IJID } from './JID.interface';
import { IContact } from './Contact.interface';
import Contact from './Contact';
import Account from './Account';
import Utils from '@util/Utils';
import HookRepository from '@util/HookRepository';
import Log from '@util/Log';
import Roster from '@ui/Roster';

const EVENT_NEW = 'new';
const EVENT_REMOVED = 'removed';

const KEY_CONTACTS = 'contacts';

export default class ContactManager {
   private providers: ContactProvider[] = [];

   private contacts: { [key: string]: IContact } = {};

   private hookRepository = new HookRepository();

   constructor(private account: Account) {
      this.registerNewContactHook((contact) => {
         Roster.get().add(contact);

         contact.getChatWindowController();
      });

      this.registerRemovedContactHook((contact) => {
         Roster.get().remove(contact)

         contact.getChatWindowController().close();
      });
   }

   public restoreCache() {
      let session = this.account.getSessionStorage();
      let cachedIds: string[] = session.getItem(KEY_CONTACTS) || [];

      cachedIds.forEach((id) => this.added(id));
      cachedIds.forEach((id) => this.triggerAddedHook(id));

      session.registerHook(KEY_CONTACTS, (newValue, oldValue, key) => {
         if (key !== KEY_CONTACTS) {
            return;
         }

         let diff = Utils.diffArray(newValue, oldValue);
         let newContactIds = diff.newValues;
         let deletedContactIds = diff.deletedValues;

         newContactIds.forEach(id => this.added(id));
         newContactIds.forEach(id => this.triggerAddedHook(id));

         deletedContactIds.forEach(id => this.deleted(id));
      });
   }

   public registerContactProvider(source: ContactProvider) {
      this.providers.push(source);
   }

   public registerNewContactHook(func: (contact: IContact) => void) {
      this.hookRepository.registerHook(EVENT_NEW, func);
   }

   public registerRemovedContactHook(func: (contact: IContact) => void) {
      this.hookRepository.registerHook(EVENT_REMOVED, func);
   }

   public async loadContacts() {
      let storage = this.account.getSessionStorage();

      if (storage.getItem('contacts', 'loaded')) {
         return;
      }

      let allContacts: IContact[][] = await Promise.all(this.providers.map(provider => provider.load()));

      allContacts.forEach(contacts => {
         contacts.forEach(contact => {
            this.contacts[contact.getId()] = contact;
         });
      });

      let contactIds = Object.keys(this.contacts).sort((a, b) => a < b ? 1 : -1);

      this.account.getSessionStorage().setItem(KEY_CONTACTS, contactIds);

      storage.setItem('contacts', 'loaded', true);
   }

   public async add(contact: IContact): Promise<void> {
      this.contacts[contact.getId()] = contact;

      let results = await Promise.all(this.providers.map(provider => provider.add(contact)));

      if (results.indexOf(true) < 0) {
         delete this.contacts[contact.getId()];

         throw new Error('Could not add contact, because all contact providers failed.');
      }

      if (!contact.getProviderId()) {
         Log.error('Provider id was not set');
      }
   }

   public addToCache(contact: IContact) {
      let id = contact.getId();
      let storage = this.account.getSessionStorage();
      let cache = storage.getItem(KEY_CONTACTS) || [];

      if (!this.contacts[id]) {
         this.contacts[id] = contact;
      }

      if (cache.indexOf(id) < 0) {
         let contactIds = Object.keys(this.contacts).sort((a, b) => a < b ? 1 : -1);

         storage.setItem(KEY_CONTACTS, contactIds);
      }
   }

   private added(id: string) {
      let contact = this.contacts[id];

      if (!contact) {
         let providerId = Contact.getProviderId(this.account, id);
         let provider = this.getProviderById(providerId);

         if (!provider) {
            Log.error(`Can not find contact provider with id ${providerId}.`);

            return;
         }

         contact = provider.createContact(id);
      }

      this.contacts[contact.getId()] = contact;
   }

   /**
    * This function should always be called after a contact was added (this.added).
    * It can't be part of the added function, because if multiple contacts are restored,
    * it could result into failing dependencies. E.g. in a muc room you need the contact
    * object of every member.
    *
    * @param id contact id
    */
   private triggerAddedHook(id: string) {
      let contact = this.contacts[id];

      if (contact) {
         this.hookRepository.trigger(EVENT_NEW, contact);
      }
   }

   private getProviderById(id: string): ContactProvider {
      let ids = this.providers.map(provider => provider.getUid());

      return this.providers[ids.indexOf(id)];
   }

   public getContact(jid: IJID): IContact {
      return this.contacts[jid.bare];
   }

   public delete(contact: IContact): Promise<void> {
      let provider = this.getProviderById(contact.getProviderId());

      return provider.deleteContact(contact.getJid());
   }

   //@REVIEW id could also be jid
   public deleteFromCache(id: string) {
      let contactIds = Object.keys(this.contacts);

      if (contactIds.indexOf(id) < 0) {
         throw new Error(`Can not delete ${id} from cache, because it does not exist.`);
      }

      this.account.getSessionStorage().setItem(KEY_CONTACTS, contactIds.filter(contactId => contactId !== id));
   }

   private deleted(id: string) {
      let contact = this.contacts[id];

      if (!contact) {
         return;
      }

      delete this.contacts[id];

      this.hookRepository.trigger(EVENT_REMOVED, contact);
   }

   public removeAllContactsFromCache() {
      this.account.getSessionStorage().setItem(KEY_CONTACTS, []);
   }
}
