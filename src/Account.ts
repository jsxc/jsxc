import Storage from './Storage'
import {IConnection} from './connection/ConnectionInterface'
import * as Connector from './connection/xmpp/connector'
import XMPPConnection from './connection/xmpp/Connection'
import StorageConnection from './connection/storage/Connection'
import JID from './JID'
import Contact from './Contact'
import ContactData from './ContactData'
import Roster from './ui/Roster'
import ChatWindow from './ui/ChatWindow'
import ChatWindowList from './ui/ChatWindowList'
import SortedPersistentMap from './SortedPersistentMap'
import PersistentMap from './PersistentMap'
import Log from './util/Log'
import {Presence} from './connection/AbstractConnection'
import Client from './Client'
import {Notice, NoticeData, TYPE as NOTICETYPE} from './Notice'

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

   private connection:IConnection;

   private connectionArguments;

   private connectionParameters:IConnectionParameters;

   private contacts = {};

   private windows:SortedPersistentMap;

   private notices:SortedPersistentMap;

   private contact:Contact;

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

      this.connection = new StorageConnection(this);

      this.contact = new Contact(this, new ContactData({
         jid: new JID(this.uid),
         name: this.uid
      }));
      Roster.get().setRosterAvatar(this.contact);

      this.restoreContacts();
      this.initNotices();
      this.initWindows();

      this.getStorage().registerHook('contact:', (contactData) => {
         let contact = new Contact(this, contactData.jid);

         if (typeof this.contacts[contact.getId()] === 'undefined') { console.log('add', contactData.jid)
            this.contacts[contact.getId()] = contact;

            Roster.get().add(contact);
         }
      });
   }

   public connect() {
      let self = this;

      if (!this.connectionArguments) {
         this.reloadConnectionData();
      }

      if (self.connectionParameters && self.connectionParameters.inactivity && (new Date()).getTime() - self.connectionParameters.timestamp > self.connectionParameters.inactivity) {
         Log.warn('Credentials expired')

         this.closeAllChatWindows();

         return Promise.reject('Credentials expired');
      }

      return Connector.login.apply(this, this.connectionArguments).then(this.successfulConnected);
   }

   public getContact(jid:JID):Contact {
      return this.contacts[jid.bare];
   }

   public addContact(data:ContactData):Contact {
      let contact = new Contact(this, data);
      contact.save();

      this.contacts[contact.getId()] = contact;

      this.save();

      return contact;
   }

   public removeContact(contact:Contact) {
      let id = contact.getId();

      if (this.contacts[id]) {
         delete this.contacts[id];

         Roster.get().remove(contact);

         //@REVIEW contact.getChatWindow would be nice
         let chatWindow = this.windows.get(id);

         if (chatWindow) {
            this.closeChatWindow(chatWindow);
         }
      }
   }

   public removeAllContacts() {
      for(let id in this.contacts) {
         let contact = this.contacts[id];

         delete this.contacts[id];

         Roster.get().remove(contact);
      }
   }

   public openChatWindow(contact:Contact) {
      let chatWindow = new ChatWindow(this, contact);

      chatWindow = ChatWindowList.get().add(chatWindow);

      this.windows.push(chatWindow);

      this.save();

      return chatWindow;
   }

   public closeChatWindow(chatWindow:ChatWindow) {
      // let id = chatWindow.getContact().getId();
console.log('chatWindow', chatWindow)
      ChatWindowList.get().remove(chatWindow);

      this.windows.remove(chatWindow);

      this.save();
   }

   public closeAllChatWindows() {
      this.windows.empty((id, chatWindow) => {
         ChatWindowList.get().remove(chatWindow);
      });
   }

   public addNotice(noticeData:NoticeData) {
      let notice = new Notice(this.getStorage(), noticeData);

      if (this.notices.get(notice.getId())) {
         return;
      }

      //Roster.get().addNotice(this, notice);

      this.notices.push(notice);
   }

   public removeNotice(notice:Notice) { console.log('removeNotice', notice);
      //Roster.get().removeNotice(this, notice);

      this.notices.remove(notice);
   }

   public getStorage() {
      if(!this.storage) {
         this.storage = new Storage(this.uid);
      }

      return this.storage;
   }

   public getConnection():IConnection {
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

      this.connection = new XMPPConnection(this, connection);

      if (status === Strophe.Status.CONNECTED) {
         Roster.get().setPresence(Presence.online);
         Roster.get().refreshOwnPresenceIndicator();

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
         contacts: Object.keys(this.contacts),
         // windows: Object.keys(this.windows)
      });
   }

   private reloadConnectionData() {
      let storedAccountData = this.getStorage().getItem('account') || {};
console.log('storedAccountData', storedAccountData)
      this.connectionParameters = storedAccountData.connectionParameters;

      let p = this.connectionParameters;
      this.connectionArguments = [p.url, (new JID(p.jid)).full, p.sid, p.rid];
   }

   private restoreContacts() {
      let storedAccountData = this.getStorage().getItem('account');

      storedAccountData.contacts.forEach((id) => {
         this.contacts[id] = new Contact(this, id);

         Roster.get().add(this.contacts[id]);
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
         let chatWindow = new ChatWindow(this, this.contacts[id]);
         this.windows[id] = chatWindow;

         ChatWindowList.get().add(chatWindow);

         return chatWindow;
      });

      this.windows.init();
   }

   private initNotices() {
      this.notices = new SortedPersistentMap(this.getStorage(), 'notices');

      this.notices.setRemoveHook((id) => {
         Roster.get().removeNotice(this, id);
      });

      this.notices.setPushHook((id) => {
         let notice = new Notice(this.getStorage(), id);

         Roster.get().addNotice(this, notice);

         return notice;
      });

      this.notices.init();
   }
}
