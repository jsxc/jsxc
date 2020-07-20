import { IContact } from './Contact.interface';
import HookRepository from '@util/HookRepository';
import Client from './Client';
import * as CONST from './CONST'

const VISIBILITY_KEY = 'rosterVisibility';

export default class Roster {
   private contacts: {[uid: string]: IContact} = {};

   private sortedContacts: IContact[] = [];

   private hookRepository: HookRepository<(contacts: IContact[]) => void>;

   private sortTimeout: number;

   constructor() {
      this.hookRepository = new HookRepository();
   }

   public addContact(contact: IContact) {
      if (this.contacts[contact.getUid()]) {
         return;
      }

      this.contacts[contact.getUid()] = contact;

      this.refresh();

      contact.registerHook('name', () => {
         this.refresh();
      });

      contact.registerHook('lastMessage', () => {
         this.refresh();
      });
   }

   public removeContact(contact: IContact) {
      if (!this.contacts[contact.getUid()]) {
         return;
      }

      delete this.contacts[contact.getUid()];

      this.refresh();
   }

   private refresh() {
      if (typeof this.sortTimeout !== 'undefined') {
         return;
      }

      this.sortTimeout = window.setTimeout(this.sortContacts, 300);
   }

   private sortContacts = () => {
      this.sortTimeout = undefined;

      this.sortedContacts = Object.values(this.contacts).sort((c1, c2) => {
         let contactName1 = c1.getName();
         let lastMessageDate1 = c1.getLastMessageDate();
         let contactName2 = c2.getName();
         let lastMessageDate2 = c2.getLastMessageDate();

         if (!lastMessageDate1 && !lastMessageDate2) {
            return contactName1.localeCompare(contactName2);
         }

         if (lastMessageDate1 && !lastMessageDate2) {
            return -1;
         }

         if (!lastMessageDate1 && lastMessageDate2) {
            return 1;
         }

         if (lastMessageDate1.getTime() === lastMessageDate2.getTime()) {
            return 0;
         }

         return lastMessageDate1.getTime() > lastMessageDate2.getTime() ? -1 : 1;
      });

      this.hookRepository.trigger('refresh', this.sortedContacts);
   }

   public registerHook(hook: (contacts: IContact[]) => void) {
      this.hookRepository.registerHook('refresh', hook);

      if (this.sortContacts.length > 0) {
         hook(this.sortedContacts);
      }
   }

   public toggle = () => {
      let state = Client.getOption(VISIBILITY_KEY);

      state = (state === CONST.HIDDEN) ? CONST.SHOWN : CONST.HIDDEN;

      Client.setOption(VISIBILITY_KEY, state);
   }
}
