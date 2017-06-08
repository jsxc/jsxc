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
import Log from './util/Log'

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

      this.windows = new SortedPersistentMap(this.getStorage(), 'windows');
      this.windows.setRemoveHook((id, chatWindow) => {
         console.log('remove hook', id, chatWindow);
         if (chatWindow) {
            ChatWindowList.get().remove(chatWindow);
         }
      });

      if (arguments.length === 1) {
         //@REVIEW this can probably called always, because the new PM iterates also over an empty list
         this.restore(this.uid);
      }

      this.getStorage().registerHook('contact:', (contactData) => {
         let contact = new Contact(this, contactData.jid);

         if (typeof this.contacts[contact.getId()] === 'undefined') {
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

         //@TODO close all chat windows

         return Promise.reject('Credentials expired');
      }

      return Connector.login.apply(this, this.connectionArguments).then(function(data) {
         let connection = data.connection;
         let status = data.status;

         self.connectionParameters = $.extend(self.connectionParameters, {
            url: connection.service,
            jid: connection.jid,
            sid: connection._proto.sid,
            rid: connection._proto.rid,
            timestamp: (new Date()).getTime()
         });

         if (connection._proto.inactivity) {
            self.connectionParameters.inactivity = connection._proto.inactivity * 1000;
         }

         self.save();

         connection.nextValidRid = function(rid){
            self.connectionParameters.timestamp = (new Date()).getTime();
            self.connectionParameters.rid = rid;
            self.save();
         };

         self.connection = new XMPPConnection(self, connection);

         self.connection.sendPresence();

         if (status === Strophe.Status.CONNECTED) {
            self.connection.getRoster().then(function() {

            });
         }
      });
   }

   public getContact(jid:JID) {
      return this.contacts[jid.bare];
   }

   public addContact(data:ContactData) {
      let contact = new Contact(this, data);
      contact.save();

      this.contacts[contact.getId()] = contact;

      this.save();
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
      console.log('jidString', jidString)
      //@REVIEW maybe promise?
      return new JID(jidString);
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

   private restore(uid:string) {
      let storedAccountData = this.getStorage().getItem('account');

      storedAccountData.contacts.forEach((id) => {
         this.contacts[id] = new Contact(this, id);

         Roster.get().add(this.contacts[id]);
      });

      this.windows.setPushHook((id) => {
         let chatWindow = new ChatWindow(this, this.contacts[id]);
         this.windows[id] = chatWindow;

         ChatWindowList.get().add(chatWindow);

         return chatWindow;
      });
      this.windows.init();

      // storedAccountData.windows.forEach((id) => {
      // });
   }
}
