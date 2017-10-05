import Storage from './Storage'
import {IConnection} from './connection/ConnectionInterface'
import * as Connector from './connection/xmpp/connector'
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
import {Presence, AbstractConnection} from './connection/AbstractConnection'
import Client from './Client'
import {NoticeManager} from './NoticeManager'
import * as StropheLib from 'strophe.js'
import PluginRepository from './plugin/PluginRepository'
import DiscoInfoRepository from './DiscoInfoRepository'
import DiscoInfoChangable from './DiscoInfoChangable'

let Strophe = StropheLib.Strophe;

interface IConnectionParameters {
   url:string,
   jid: string,
   sid?:string,
   rid?:string,
   timestamp?:number,
   inactivity?:number
};

export default class Account {
   private storage:Storage;

   private uid:string;

   private connection:AbstractConnection;

   private connectionArguments;

   private connectionParameters:IConnectionParameters;

   private contacts = {};

   private windows:SortedPersistentMap;

   private notices:SortedPersistentMap;

   private contact:Contact;

   private noticeManager:NoticeManager;

   private pluginRepository:PluginRepository;

   private discoInfoRepository:DiscoInfoRepository;

   private ownDiscoInfo:DiscoInfoChangable;

   constructor(boshUrl: string, jid: string, sid: string, rid:string);
   constructor(boshUrl: string, jid: string, password: string);
   constructor(uid:string);
   constructor() {
      if (arguments.length === 1) {
         this.uid = arguments[0];
      } else if (arguments.length === 3 || arguments.length === 4) {
         this.uid = (new JID(arguments[1])).bare;
         this.connectionArguments = arguments;
      }

      this.discoInfoRepository = new DiscoInfoRepository(this);
      this.ownDiscoInfo = new DiscoInfoChangable(this.uid);

      this.connection = new StorageConnection(this);

      this.noticeManager = new NoticeManager(this.getStorage());

      this.contact = new Contact(this, new JID(this.uid), this.uid);
      Roster.get().setRosterAvatar(this.contact);

      this.pluginRepository = new PluginRepository(this);

      this.initContacts();
      this.initWindows();
   }

   public connect() {
      let self = this;

      if (!this.connectionArguments) {
         this.reloadConnectionData();

         if (self.connectionParameters && self.connectionParameters.inactivity && (new Date()).getTime() - self.connectionParameters.timestamp > self.connectionParameters.inactivity) {
            Log.warn('Credentials expired')

            this.closeAllChatWindows();

            return Promise.reject('Credentials expired');
         }
      }

      return Connector.login.apply(this, this.connectionArguments).then(this.successfulConnected);
   }

   public getPluginRepository():PluginRepository {
      return this.pluginRepository;
   }

   public getDiscoInfoRepository():DiscoInfoRepository {
     return this.discoInfoRepository;
   }

   public getDiscoInfo():DiscoInfoChangable {
     return this.ownDiscoInfo;
   }

   public getContact(jid:JID):Contact {
      return this.contacts[jid.bare];
   }

   public addMultiUserContact(jid:JID, name?:string):MultiUserContact {
      return this.addContactObject(new MultiUserContact(this, jid, name));
   }

   public addContact(jid:JID, name?:string):Contact {
      return this.addContactObject(new Contact(this, jid, name));
   }

   public removeContact(contact:Contact) {
      let id = contact.getJid().bare;

      if (this.contacts[id]) {
         delete this.contacts[id];

         Roster.get().remove(contact);

         //@TODO if MultiUserContact remove from multiUserContacts

         //@REVIEW contact.getChatWindow would be nice
         let chatWindow = this.windows.get(id);

         if (chatWindow) {
            this.closeChatWindow(chatWindow);
         }

         this.save();
      }
   }

   public removeAllContacts() {
      for(let id in this.contacts) {
         let contact = this.contacts[id];

         delete this.contacts[id];

         Roster.get().remove(contact);
      }
   }

   public addChatWindow(chatWindow:ChatWindow) {
      chatWindow = ChatWindowList.get().add(chatWindow);

      this.windows.push(chatWindow);

      this.save();

      return chatWindow;
   }

   public closeChatWindow(chatWindow:ChatWindow) {
      ChatWindowList.get().remove(chatWindow);

      this.windows.remove(chatWindow);

      this.save();
   }

   public closeAllChatWindows() {
      this.windows.empty((id, chatWindow) => {
         ChatWindowList.get().remove(chatWindow);
      });
   }

   public getNoticeManager():NoticeManager {
      return this.noticeManager;
   }

   public getStorage() {
      if(!this.storage) {
         this.storage = new Storage(this.uid);
      }

      return this.storage;
   }

   public getConnection():AbstractConnection {
      return this.connection;
   }

   public getUid() {
      return this.uid;
   }

   public getJID():JID {
      let storedAccountData = this.getStorage().getItem('account') || {};
      let jidString = (storedAccountData.connectionParameters) ? storedAccountData.connectionParameters.jid : this.getUid();

      //@REVIEW maybe promise?
      return new JID(jidString);
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

   private successfulConnected = (data) => {
      let connection = data.connection;
      let status = data.status;

      this.connectionParameters = $.extend(this.connectionParameters, {
         url: connection.service,
         jid: connection.jid,
         sid: connection._proto.sid,
         rid: connection._proto.rid,
         timestamp: (new Date()).getTime()
      });

      if (connection._proto.inactivity) {
         this.connectionParameters.inactivity = connection._proto.inactivity * 1000;
      }

      this.save();

      connection.connect_callback = (status) => {
         if (status === Strophe.Status.DISCONNECTED) {
            this.connectionDisconnected();
         }
      }

      connection.nextValidRid = (rid) => {
         this.connectionParameters.timestamp = (new Date()).getTime();
         this.connectionParameters.rid = rid;
         this.save();
      };

      this.connection.close();
      this.connection = new XMPPConnection(this, connection);

      if (status === Strophe.Status.CONNECTED) {
         Roster.get().setPresence(Presence.online);
         Roster.get().refreshOwnPresenceIndicator();

         this.removeNonpersistentContacts();

         this.connection.getRoster().then(() => {
            this.connection.sendPresence();
         });
      } else {
         this.connection.sendPresence();
      }
   }

   private connectionDisconnected() {
      console.log('disconnected');

      this.remove();
   }

   private save() {
      this.getStorage().setItem('account', {
         connectionParameters: this.connectionParameters,
         contacts: Object.keys(this.contacts)
      });
   }

   private reloadConnectionData() {
      let storedAccountData = this.getStorage().getItem('account') || {};

      this.connectionParameters = storedAccountData.connectionParameters;

      let p = this.connectionParameters;
      this.connectionArguments = [p.url, (new JID(p.jid)).full, p.sid, p.rid];
   }

   private initContacts() {
      let storedAccountData = this.getStorage().getItem('account') || {};
      let contacts = storedAccountData.contacts || [];

      contacts.forEach((id) => {
         let contact = new Contact(this, id);

         if (contact.getType() === 'groupchat'){
            contact = new MultiUserContact(this, id);
         }

         this.contacts[id] = contact;

         Roster.get().add(contact);
      });

      this.getStorage().registerHook('contact:', (contactData) => {
         //@REVIEW duplicate
         let contact = new Contact(this, contactData.jid);

         if (contact.getType() === 'groupchat'){
            contact = new MultiUserContact(this, contactData.jid);
         }

         if (typeof this.contacts[contact.getId()] === 'undefined') {
            this.contacts[contact.getId()] = contact;

            Roster.get().add(contact);
         }
      });
   }

   private initWindows() {
      this.windows = new SortedPersistentMap(this.getStorage(), 'windows');

      this.windows.setRemoveHook((id, chatWindow) => {
         console.log('remove hook', id, chatWindow);
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
      for(let contactId in this.contacts) {
         let contact = this.contacts[contactId];
         if (!contact.isPersistent()) {
            this.removeContact(contact);
         }
      }
   }
}
