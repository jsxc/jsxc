import Storage from './Storage'
import { IConnection } from './connection/Connection.interface'
import Connector from './connection/xmpp/Connector'
import XMPPConnection from './connection/xmpp/Connection'
import StorageConnection from './connection/storage/Connection'
import JID from './JID'
import Contact from './Contact'
import MultiUserContact from './MultiUserContact'
import Roster from './ui/Roster'
import ChatWindow from './ui/ChatWindow'
import MultiUserChatWindow from './ui/MultiUserChatWindow'
import ChatWindowList from './ui/ChatWindowList'
import SortedPersistentMap from './util/SortedPersistentMap'
import PersistentMap from './util/PersistentMap'
import Log from './util/Log'
import { Presence, AbstractConnection } from './connection/AbstractConnection'
import Client from './Client'
import { NoticeManager } from './NoticeManager'
import * as StropheLib from 'strophe.js'
import PluginRepository from './plugin/PluginRepository'
import DiscoInfoRepository from './DiscoInfoRepository'
import DiscoInfoChangable from './DiscoInfoChangable'
import HookRepository from './util/HookRepository'

let Strophe = StropheLib.Strophe;

interface IConnectionParameters {
   url: string,
   jid: string,
   sid?: string,
   rid?: string,
   timestamp?: number,
   inactivity?: number
};

export default class Account {
   private storage: Storage;

   private sessionStorage: Storage;

   private uid: string;

   private connection: IConnection;

   private connector: Connector;

   private contacts = {};

   private windows: SortedPersistentMap;

   private notices: SortedPersistentMap;

   private contact: Contact;

   private noticeManager: NoticeManager;

   private pluginRepository: PluginRepository;

   private discoInfoRepository: DiscoInfoRepository;

   private ownDiscoInfo: DiscoInfoChangable;

   private hookRepository = new HookRepository<any>();

   constructor(boshUrl: string, jid: string, sid: string, rid: string);
   constructor(boshUrl: string, jid: string, password: string);
   constructor(uid: string);
   constructor() {
      if (arguments.length === 1) {
         this.uid = arguments[0];
      } else if (arguments.length === 3 || arguments.length === 4) {
         this.uid = (new JID(arguments[1])).bare;
      } else {
         throw 'Unsupported number of arguments';
      }

      this.discoInfoRepository = new DiscoInfoRepository(this);
      this.ownDiscoInfo = new DiscoInfoChangable(this.uid);
      this.connector = new Connector(this, arguments[0], arguments[1], arguments[2], arguments[3]);
      this.connection = new StorageConnection(this);
      this.noticeManager = new NoticeManager(this.getStorage());
      this.contact = new Contact(this, new JID(this.uid), this.uid);
      this.pluginRepository = new PluginRepository(this);

      //@TODO this doesnt work in a multi account setup
      Roster.get().setRosterAvatar(this.contact);

      this.initContacts();
      this.initWindows();
   }

   public connect = (pause: boolean = false) => {
      return this.connector.connect().then(([status, connection]) => {
         this.connection = connection;

         if (pause) {
            (<any>this.connection).pause(); //@TODO fix ts type
         } else {
            this.initConnection(status);
         }

         let storage = this.getStorage();
         storage.setItem('connectionStatus', {
            // @TODO add session id to handle old values
            status: status
         });
      });
   }

   private initConnection(status): Promise<void> {
      let storage = this.getStorage();
      let connectionStatusObject = storage.getItem('connectionStatus') || {};
      let previousStatus = connectionStatusObject.status;

      //@REVIEW we have to make sure this is only called once (special case: connection pause)
      if (status === Strophe.Status.CONNECTED /*|| previousStatus === Strophe.Status.CONNECTED*/) {
         Roster.get().setPresence(Presence.online);
         Roster.get().refreshOwnPresenceIndicator();

         this.removeNonpersistentContacts();

         return this.connection.getRoster().then(() => {
            this.connection.sendPresence();
         });
      }

      return Promise.resolve();
   }

   public triggerConnectionHook = (status: number, condition?: string) => {
      this.hookRepository.trigger('connection', status, condition);
   }

   public registerConnectionHook = (func: (status: number, condition?: string) => void) => {
      this.hookRepository.registerHook('connection', func);
   }

   public getPluginRepository(): PluginRepository {
      return this.pluginRepository;
   }

   public getDiscoInfoRepository(): DiscoInfoRepository {
      return this.discoInfoRepository;
   }

   public getDiscoInfo(): DiscoInfoChangable {
      return this.ownDiscoInfo;
   }

   public getContact(jid: JID): Contact {
      return this.contacts[jid.bare];
   }

   public addMultiUserContact(jid: JID, name?: string): MultiUserContact {
      return this.addContactObject(new MultiUserContact(this, jid, name));
   }

   public addContact(jid: JID, name?: string): Contact {
      return this.addContactObject(new Contact(this, jid, name));
   }

   public removeContact(contact: Contact) {
      let id = contact.getJid().bare;

      if (this.contacts[id]) {
         delete this.contacts[id];

         Roster.get().remove(contact);

         //@REVIEW this only works as long as contact and window id are the same
         let chatWindow = this.windows.get(id);

         if (chatWindow) {
            this.closeChatWindow(chatWindow);
         }

         this.save();
      }
   }

   public removeAllContacts() {
      for (let id in this.contacts) {
         let contact = this.contacts[id];

         this.removeContact(contact);
      }
   }

   public addChatWindow(chatWindow: ChatWindow): ChatWindow {
      chatWindow = ChatWindowList.get().add(chatWindow);

      this.windows.push(chatWindow);

      return chatWindow;
   }

   public closeChatWindow(chatWindow: ChatWindow) {
      ChatWindowList.get().remove(chatWindow);

      this.windows.remove(chatWindow);
   }

   public closeAllChatWindows() {
      this.windows.empty((id, chatWindow) => {
         ChatWindowList.get().remove(chatWindow);
      });
   }

   public getNoticeManager(): NoticeManager {
      return this.noticeManager;
   }

   public getStorage() {
      if (!this.storage) {
         this.storage = new Storage(this.uid);
      }

      return this.storage;
   }

   public getSessionStorage() {
      if (!this.sessionStorage) {
         let sid = (<any>this.getConnection()).getSessionId();

         if (!sid) {
            //@REVIEW maybe use buffer
            throw 'Session ID not available';
         }

         let name = this.uid + ':sest:' + sid;

         this.sessionStorage = new Storage(name);
         //@TODO save name for clean up
      }

      return this.sessionStorage;
   }

   public getConnection(): IConnection {
      return this.connection;
   }

   public getUid(): string {
      return this.uid;
   }

   public getJID(): JID {
      //@REVIEW maybe promise?
      return this.connector.getJID() || new JID(this.getUid());
   }

   public remove() {
      this.removeAllContacts();
      this.closeAllChatWindows();

      Client.removeAccount(this);
   }

   private addContactObject(contact) {
      this.contacts[contact.getId()] = contact;

      this.save();

      return contact;
   }

   public connectionDisconnected() {
      console.log('disconnected');

      this.remove();
   }

   private save() {
      this.getStorage().setItem('account', {
         contacts: Object.keys(this.contacts)
      });
   }

   private initContacts() {
      let storedAccountData = this.getStorage().getItem('account') || {};
      let contacts = storedAccountData.contacts || [];

      contacts.forEach((id) => {
         let contact = this.createNewContact(id);

         this.contacts[id] = contact;

         Roster.get().add(contact);
      });

      this.getStorage().registerHook('contact:', (contactData) => {
         let contact = this.createNewContact(contactData.jid);

         if (typeof this.contacts[contact.getId()] === 'undefined') {
            this.contacts[contact.getId()] = contact;

            Roster.get().add(contact);
         }
      });
   }

   private createNewContact(id: string): Contact {
      let contact = new Contact(this, id);

      if (contact.getType() === 'groupchat') {
         contact = new MultiUserContact(this, id);
      }

      return contact;
   }

   private initWindows() {
      this.windows = new SortedPersistentMap(this.getStorage(), 'windows');

      this.windows.setRemoveHook((id, chatWindow) => {
         if (chatWindow) {
            ChatWindowList.get().remove(chatWindow);
         }
      });

      this.windows.setPushHook((id) => {
         this.windows[id] = this.contacts[id].getChatWindow();

         ChatWindowList.get().add(this.windows[id]);

         return this.windows[id];
      });

      this.windows.init();
   }

   private removeNonpersistentContacts() {
      for (let contactId in this.contacts) {
         let contact = this.contacts[contactId];
         if (!contact.isPersistent()) {
            this.removeContact(contact);
         }
      }
   }
}
