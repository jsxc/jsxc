import Storage from './Storage'
import {IConnection} from './connection/ConnectionInterface'
import * as Connector from './connection/xmpp/connector'
import XMPPConnection from './connection/xmpp/connection'
import JID from './JID'
import Contact from './Contact'
import ContactData from './ContactData'
import Roster from './ui/Roster'
import ChatWindow from './ui/ChatWindow'
import ChatWindowList from './ui/ChatWindowList'

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

   constructor(boshUrl: string, jid: string, sid: string, rid:string);
   constructor(boshUrl: string, jid: string, password: string);
   constructor(uid:string);
   constructor() {
      if (arguments.length === 1) {
         this.restore(arguments[0]);
      } else if (arguments.length === 3 || arguments.length === 4) {
         this.uid = (new JID(arguments[1])).bare;
         this.connectionArguments = arguments;
      }

      this.getStorage().registerHook('contact:', (contactData) => {
         let contact = new Contact(this, contactData);

         Roster.get().add(contact);
      });
   }

   public connect() {
      let self = this;

      if (self.connectionParameters && self.connectionParameters.inactivity && (new Date()).getTime() - self.connectionParameters.timestamp > self.connectionParameters.inactivity) {
         console.warn('Credentials expired')

         return Promise.reject('Credentials expired');
      }

      return Connector.login.apply(this, this.connectionArguments).then(function(data) {window._conn = connection;
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

         self.connection = new XMPPConnection(connection);

         self.connection.sendPresence();

         if (status === Strophe.Status.CONNECTED) {
            self.connection.getRoster().then(function(){

            });
         }
      });
   }

   public addContact(data:ContactData) {
      let contact = new Contact(this, data);
      contact.save();

      this.contacts[contact.getId()] = contact;

      this.save();
   }

   public openChatWindow(contact:Contact) {
      let chatWindow = new ChatWindow(this, contact);

      ChatWindowList.get().add(chatWindow);
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

   private save() {
      this.getStorage().setItem('account', {
         connectionParameters: this.connectionParameters,
         contacts: Object.keys(this.contacts)
      });
   }

   private restore(uid:string) {
      this.uid = uid;

      let storedAccountData = this.getStorage().getItem('account');
      this.connectionParameters = storedAccountData.connectionParameters;

      let p = this.connectionParameters;
      this.connectionArguments = [p.url, (new JID(p.jid)).bare, p.sid, p.rid];

      storedAccountData.contacts.forEach((id) => { console.log('restore contact with id', id)
         this.contacts[id] = new Contact(this, id);

         Roster.get().add(this.contacts[id]);
      });
   }
}
