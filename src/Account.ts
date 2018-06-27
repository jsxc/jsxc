import Storage from './Storage'
import { IConnection } from './connection/Connection.interface'
import Connector from './connection/xmpp/Connector'
import StorageConnection from './connection/storage/Connection'
import JID from './JID'
import Contact from './Contact'
import MultiUserContact from './MultiUserContact'
import Roster from './ui/Roster'
import ChatWindow from './ui/ChatWindow'
import ChatWindowList from './ui/ChatWindowList'
import SortedPersistentMap from './util/SortedPersistentMap'
import { Presence } from './connection/AbstractConnection'
import Client from './Client'
import { NoticeManager } from './NoticeManager'
import PluginRepository from './plugin/PluginRepository'
import DiscoInfoRepository from './DiscoInfoRepository'
import DiscoInfoChangable from './DiscoInfoChangable'
import HookRepository from './util/HookRepository'
import Options from './Options'
import UUID from './util/UUID'
import ClientAvatar from './ClientAvatar'

type ConnectionCallback = (status: number, condition?: string) => void;

export default class Account {
   private storage: Storage;

   private sessionStorage: Storage;

   private sessionId: string;

   private uid: string;

   private connection: IConnection;

   private connector: Connector;

   private contacts = {};

   private windows: SortedPersistentMap;


   private contact: Contact;

   private noticeManager: NoticeManager;

   private pluginRepository: PluginRepository;

   private discoInfoRepository: DiscoInfoRepository;

   private ownDiscoInfo: DiscoInfoChangable;

   private hookRepository = new HookRepository<any>();

   private options: Options;

   constructor(boshUrl: string, jid: string, sid: string, rid: string);
   constructor(boshUrl: string, jid: string, password: string);
   constructor(uid: string);
   constructor() {
      if (arguments.length === 1) {
         this.uid = arguments[0];
         this.sessionId = this.getStorage().getItem('sessionId');
      } else if (arguments.length === 3 || arguments.length === 4) {
         this.uid = (new JID(arguments[1])).bare;
         this.sessionId = UUID.v4();

         let oldSessionId = this.getStorage().getItem('sessionId');
         this.getStorage().setItem('sessionId', this.sessionId);

         if (oldSessionId) {
            Storage.clear(this.uid + '@' + oldSessionId);
         }
      } else {
         throw 'Unsupported number of arguments';
      }

      this.options = Options.get();
      this.discoInfoRepository = new DiscoInfoRepository(this);
      this.ownDiscoInfo = new DiscoInfoChangable(this.uid);
      this.connector = new Connector(this, arguments[0], arguments[1], arguments[2], arguments[3]);
      this.connection = new StorageConnection(this);
      this.noticeManager = new NoticeManager(this.getStorage());
      this.contact = new Contact(this, new JID(this.uid), this.uid);
      this.pluginRepository = new PluginRepository(this);

      let connectionCallback = this.getOption('connectionCallback');

      if (typeof connectionCallback === 'function') {
         this.registerConnectionHook((status, condition) => {
            connectionCallback(this.uid, status, condition);
         });
      }

      ClientAvatar.get().registerAccount(this)

      this.initContacts();
      this.initWindows();
   }

   public getOption(key) {
      return this.options.get(key, this);
   }

   public setOption(key, value) {
      this.options.set(key, value, this);
   }

   public connect = (pause: boolean = false): Promise<void> => {
      let targetPresence = Client.getPresenceController().getTargetPresence();

      if (targetPresence === Presence.offline) {
         Client.getPresenceController().setTargetPresence(Presence.online);
      }

      return this.connector.connect().then(([status, connection]) => {
         this.connection = connection;

         let storage = this.getSessionStorage();
         storage.setItem('connection', 'created', new Date());

         if (pause) {
            (<any>this.connection).pause(); //@TODO fix ts type
         } else {
            this.initConnection(status);
         }
      });
   }

   private initConnection(status): Promise<void> {
      let storage = this.getSessionStorage();

      if (!storage.getItem('roster:loaded')) {
         this.removeNonpersistentContacts();

         return this.connection.getRosterService().getRoster().then(() => {
            storage.setItem('roster:loaded', true);

            let targetPresence = Client.getPresenceController().getTargetPresence();
            this.connection.sendPresence(targetPresence);
         });
      }

      return Promise.resolve();
   }

   public triggerPresenceHook = (contact: Contact, presence, oldPresence) => {
      this.hookRepository.trigger('presence', contact, presence, oldPresence);
   }

   public registerPresenceHook = (func) => {
      this.hookRepository.registerHook('presence', func);
   }

   public triggerConnectionHook = (status: number, condition?: string) => {
      this.hookRepository.trigger('connection', status, condition);
   }

   public registerConnectionHook = (func: ConnectionCallback) => {
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

   public getContact(jid?: JID): Contact {
      return jid && jid.bare !== this.getJID().bare ? this.contacts[jid.bare] : this.contact;
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
         let name = this.uid + '@' + this.sessionId;

         this.sessionStorage = new Storage(name);
      }

      return this.sessionStorage;
   }

   public getPresence(): Presence {
      let sessionStorage = this.getSessionStorage();
      let presence = sessionStorage.getItem('presence');

      return typeof presence === 'number' ? presence : Presence.offline;
   }

   public setPresence(presence: Presence) {
      this.getSessionStorage().setItem('presence', presence);
   }

   public getConnection(): IConnection {
      return this.connection;
   }

   public getUid(): string {
      return this.uid;
   }

   public getSessionId(): string {
      return this.sessionId;
   }

   public getJID(): JID {
      //@REVIEW maybe promise?
      return this.connector.getJID() || new JID(this.getUid());
   }

   public getConnectionUrl(): string {
      return this.connector.getUrl();
   }

   public remove() {
      this.removeAllContacts();
      this.closeAllChatWindows();

      this.getConnection().close();
      this.getStorage().removeAllHooks();
      this.getNoticeManager().removeAll();

      Client.removeAccount(this);
   }

   private addContactObject(contact) {
      this.contacts[contact.getId()] = contact;

      this.save();

      return contact;
   }

   public connectionDisconnected() {
      this.setPresence(Presence.offline);

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
