import Storage from './Storage'
import { IConnection } from './connection/Connection.interface'
import Connector from './connection/xmpp/Connector'
import StorageConnection from './connection/storage/Connection'
import JID from './JID'
import Contact from './Contact'
import MultiUserContact from './MultiUserContact'
import Roster from './ui/Roster'
import { Presence } from './connection/AbstractConnection'
import Client from './Client'
import { NoticeManager } from './NoticeManager'
import PluginRepository from './plugin/PluginRepository'
import DiscoInfoRepository from './DiscoInfoRepository'
import DiscoInfoChangeable from './DiscoInfoChangeable'
import HookRepository from './util/HookRepository'
import Options from './Options'
import UUID from './util/UUID'
import ClientAvatar from './ClientAvatar'
import Pipe from './util/Pipe'
import ChatWindow from '@ui/ChatWindow';

type ConnectionCallback = (status: number, condition?: string) => void;

export default class Account {
   private storage: Storage;

   private sessionStorage: Storage;

   private sessionId: string;

   private uid: string;

   private connection: IConnection;

   private connector: Connector;

   private contacts = {};

   private contact: Contact;

   private noticeManager: NoticeManager;

   private pluginRepository: PluginRepository;

   private discoInfoRepository: DiscoInfoRepository;

   private ownDiscoInfo: DiscoInfoChangeable;

   private hookRepository = new HookRepository<any>();

   private options: Options;

   private pipes = {};

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
      this.ownDiscoInfo = new DiscoInfoChangeable(this.uid);
      this.connector = new Connector(this, arguments[0], arguments[1], arguments[2], arguments[3]);
      this.connection = new StorageConnection(this);
      this.noticeManager = new NoticeManager(this.getStorage());
      this.pluginRepository = new PluginRepository(this);
      this.contact = new Contact(this, new JID(this.uid), this.uid);

      let connectionCallback = this.getOption('connectionCallback');

      if (typeof connectionCallback === 'function') {
         this.registerConnectionHook((status, condition) => {
            connectionCallback(this.uid, status, condition);
         });
      }

      ClientAvatar.get().registerAccount(this)

      this.initContacts();
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
            connection.pause();
         } else {
            this.initConnection(status);
         }
      }).catch(err => {
         if (Client.getAccounts().length <= 1) {
            Client.getPresenceController().setTargetPresence(Presence.offline)
         }

         throw err;
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

   public triggerChatWindowInitializedHook = (chatWindow: ChatWindow, contact: Contact) => {
      this.hookRepository.trigger('chatWindowInitialized', chatWindow, contact);
   }

   public registerChatWindowInitializedHook = (func: (chatWindow?: ChatWindow, contact?: Contact) => void) => {
      this.hookRepository.registerHook('chatWindowInitialized', func);
   }

   public triggerChatWindowClearedHook = (chatWindow: ChatWindow, contact: Contact) => {
      this.hookRepository.trigger('chatWindowCleared', chatWindow, contact);
   }

   public registerChatWindowClearedHook = (func: (chatWindow?: ChatWindow, contact?: Contact) => void) => {
      this.hookRepository.registerHook('chatWindowCleared', func);
   }

   public getPluginRepository(): PluginRepository {
      return this.pluginRepository;
   }

   public getDiscoInfoRepository(): DiscoInfoRepository {
      return this.discoInfoRepository;
   }

   public getDiscoInfo(): DiscoInfoChangeable {
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
         Roster.get().remove(contact);

         contact.getChatWindowController().close();

         this.save();

         delete this.contacts[id];
      }
   }

   public removeAllContacts() {
      for (let id in this.contacts) {
         let contact = this.contacts[id];

         this.removeContact(contact);
      }
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

   public getPipe(name: string): Pipe {
      if (!this.pipes[name]) {
         this.pipes[name] = new Pipe();
      }

      return this.pipes[name];
   }

   public remove() {
      this.destroy();

      Client.removeAccount(this);
   }

   public destroy() {
      this.removeAllContacts();

      this.getConnection().close();
      this.getStorage().destroy();
      this.getNoticeManager().removeAll();

      for (const name in this.pipes) {
         this.pipes[name].destroy();
      }

      //@TODO destroy plugins
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

      this.getStorage().registerHook('contact', (contactData) => {
         if (contactData.id === this.contact.getId()) {
            return;
         }

         let id = contactData.id;

         if (typeof this.contacts[id] === 'undefined') {
            let contact = this.createNewContact(id);

            this.contacts[id] = contact;

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

   private removeNonpersistentContacts() {
      for (let contactId in this.contacts) {
         let contact = this.contacts[contactId];
         if (!contact.isPersistent()) {
            this.removeContact(contact);
         }
      }
   }
}
