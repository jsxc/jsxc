import ContactProvider from '@src/ContactProvider';
import AbstractService from './services/AbstractService';
import RoomBookmark from './RoomBookmark';
import MultiUserContact, { ROOMCONFIG } from '@src/MultiUserContact';
import { IJID } from '@src/JID.interface';
import { IContact, ContactType } from '@src/Contact.interface';
import ContactManager from '@src/ContactManager';
import RoleAllocator from '@src/RoleAllocator';

export default class BookmarkProvider extends ContactProvider {
   private services: {[name: string]: AbstractService} = {};

   constructor(contactManager: ContactManager, private createMultiUserContact: (jid: IJID, name?: string) => MultiUserContact) {
      super(contactManager);
   }

   public getUid(): string {
      return 'bookmark';
   }

   public async add(contact: MultiUserContact): Promise<boolean> {
      if (contact.getType() !== ContactType.GROUPCHAT) {
         return false;
      }

      let bookmark = this.contactToBookmark(contact);

      try {
         await this.addToServices(bookmark);
      } catch (err) {
         return false;
      }

      contact.setProvider(this);
      this.registerContact(contact);
      this.contactManager.addToCache(contact);

      return true;
   }

   public addToServices(bookmark: RoomBookmark): Promise<any> {
      let results = [];
      for (let name in this.services) {
         let service = this.services[name];

         results.push(service.addRoom(bookmark));
      }

      return Promise.all(results);
   }

   private contactToBookmark(contact: MultiUserContact): RoomBookmark {
      let id = contact.getJid();
      let alias = contact.hasName() ? contact.getName() : undefined;
      let nickname = contact.getNickname();
      let autoJoin = contact.isAutoJoin();
      let password = contact.getPassword();

      return new RoomBookmark(id, alias, nickname, autoJoin, password);
   }

   public createContact(jid: IJID, name?: string): MultiUserContact;
   public createContact(id: string): MultiUserContact;
   public createContact() {
      let contact = this.createMultiUserContact(arguments[0], arguments[1]);

      this.registerContact(contact);

      return contact;
   }

   private registerContact(contact: MultiUserContact) {
      //@TODO add hooks for more settings
      //@TODO delay update to aggregate changes
      contact.registerHook('name', () => {
         if (RoleAllocator.get().isMaster()) {
            this.updateContact(contact);
         }
      });
   }

   private updateContact(contact: MultiUserContact): Promise<any> {
      let bookmark = this.contactToBookmark(contact);

      return this.addToServices(bookmark);
   }

   public registerService(service: AbstractService) {
      this.services[service.getName()] = service;
   }

   public async deleteContact(jid: IJID): Promise<void> {
      let results = [];

      for (let name in this.services) {
         let service = this.services[name];

         results.push(service.removeRoom(jid));
      }

      await Promise.all(results);

      this.contactManager.deleteFromCache(jid.bare);
   }

   public async load(): Promise<IContact[]> {
      let bookmarks = await this.getReducedBookmarksFromServices();
      let contacts = [];

      for (let id in bookmarks) {
         let bookmark = bookmarks[id];
         contacts[contacts.length] = this.initBookmarkContact(bookmark.room, bookmark.service);
      }

      return contacts;
   }

   private async getReducedBookmarksFromServices(): Promise<{ [id: string]: {room: RoomBookmark, service: AbstractService} }> {
      let bookmarks: { [id: string]: {room: RoomBookmark, service: AbstractService} } = {};

      for (let name in this.services) {
         let service = this.services[name];
         let rooms = await service.getRooms();

         for (let room of rooms) {
            bookmarks[room.getId()] = {
               room,
               service
            };
         }
      }

      return bookmarks;
   }

   private initBookmarkContact(bookmark: RoomBookmark, service: AbstractService): IContact {
      let contact = this.createContact(bookmark.getJid());
      contact.setNickname(bookmark.getNickname());
      contact.setPassword(bookmark.getPassword());
      contact.setBookmark(true);
      contact.setAutoJoin(bookmark.isAutoJoin());
      contact.setProvider(this);

      if (bookmark.hasAlias()) {
         contact.setName(bookmark.getAlias());
      }

      if (bookmark.isAutoJoin()) {
         contact.setRoomConfiguration(ROOMCONFIG.INSTANT);
         contact.join();
      }

      return contact;
   }
}
