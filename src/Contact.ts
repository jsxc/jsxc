import Storage from './Storage'
import JID from './JID'
import Message from './Message'
import Notification from './Notification'
import Translation from './util/Translation'
import Account from './Account'
import ContactData from './ContactData'

export default class Contact {
   private storage: Storage;

   private readonly account:Account;

   // @REVIEW Data to own object/type?
   private data:ContactData;

   constructor(account:Account, data: ContactData);
   constructor(account:Account, id:string);
   constructor() {
      this.account = arguments[0];
      this.storage = this.account.getStorage();

      if (typeof arguments[1] === 'string') {
         let id = arguments[1];
         this.data = this.storage.getItem('contact', id);
         this.data.jid = new JID(this.data.jid.full);

         return;
      }

      let data = arguments[1] || {};

      if (!data.jid) {
         throw 'Jid missing';
      } else if (typeof data.jid === 'string') {
         data.jid = new JID(data.jid);
      }

      this.data = data;
      this.data.rnd = Math.random() // force storage event
   }

   public save() {
      if (this.storage.getItem('contact', this.getId())) {
         this.storage.updateItem('contact', this.getId(), this.data);

         return 'updated';
      }

      this.storage.setItem('contact', this.getId(), this.data);

      return 'created';
   }

   public openWindow = () => {
      this.account.openChatWindow(this);
   }

   public setStatus(resource:string, status) {
      if (status === 0) {
         delete this.data.resources[resource];
      } else if (resource) {
         this.data.resources[resource] = status;
      }

      let maxStatus = this.getHighestStatus();

      if (this.data.status === 0 && maxStatus > 0) {
         // buddy has come online
         Notification.notify({
            title: this.data.name,
            message: Translation.t('has_come_online'),
            source: this.getId()
         });
      }

      if (this.data.type === 'groupchat') {
         this.data.status = status;
      } else {
         this.data.status = maxStatus;
      }
   }

   public sendMessage(message:Message) {
      message.bid = this.getId();
   }

   public getId():string {
      return this.data.jid.bare;
   }

   public getFingerprint() {
      return this.data.fingerprint;
   }

   public getMsgState() {
      return this.data.msgstate;
   }

   public getPresence() {
      return this.data.status;
   }

   public getType() {
      return this.data.type;
   }

   public getNumberOfUnreadMessages():number {

   }

   public getName():string {
      return this.data.name || this.data.jid.bare;
   }

   public getAvatar():Promise {

   }

   public getSubscription() {
      return this.data.subscription;
   }

   public isEncrypted() {

   }

   public setTrust(trust:boolean) {
      this.data.trust = trust;

      this.save();
   }

   public setName(name:string) {
      this.data.name = name;

      this.save();

      //@TODO call connection.setDisplayname
   }

   private getHighestStatus() {
      var maxStatus = 0;

      for (let resource in this.data.resources) {
         if(this.data.resources[resource] > maxStatus) {
            maxStatus = this.data.resources[resource];
         }
      }

      return maxStatus;
   }
}
