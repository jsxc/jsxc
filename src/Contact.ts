import Storage from './Storage'
import JID from './JID'
import Message from './Message'
import Notification from './Notification'
import Translation from './util/Translation'
import Account from './Account'
import ContactData from './ContactData'
import PersistentMap from './PersistentMap'
import IdentifiableInterface from './IdentifiableInterface'

export default class Contact implements IdentifiableInterface {
   private storage: Storage;

   private readonly account:Account;

   // @REVIEW Data to own object/type?
   private data:PersistentMap;

   private jid:JID;

   constructor(account:Account, data: ContactData);
   constructor(account:Account, id:string);
   constructor() {
      this.account = arguments[0];
      this.storage = this.account.getStorage();

      if (typeof arguments[1] === 'string') {
         let id = arguments[1];
         this.data = new PersistentMap(this.storage, 'contact', id);
         this.jid = new JID(this.data.get('jid'));

         return;
      }

      let data = arguments[1] || {};

      if (!data.jid) {
         throw 'Jid missing';
      } else if (typeof data.jid === 'string') {
         this.jid = new JID(data.jid);
      } else {
         this.jid = data.jid;
         data.jid = this.jid.full;
      }

      this.data = new PersistentMap(this.storage, 'contact', this.jid.bare);

      data.rnd = Math.random() // force storage event
      this.data.set(data);
   }

   public save() {
      // if (this.storage.getItem('contact', this.getId())) {
      //    this.storage.updateItem('contact', this.getId(), this.data);
      //
      //    return 'updated';
      // }
      //
      // this.storage.setItem('contact', this.getId(), this.data);
      //
      // return 'created';
   }

   public openWindow = () => {
      return this.account.openChatWindow(this);
   }

   public setStatus(resource:string, status) {
      //@TODO fix
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
      // message.bid = this.getId();
   }

   public getId():string {
      return this.jid.bare;
   }

   public getJid():JID {
      return this.jid;
   }

   public getFingerprint() {
      return this.data.get('fingerprint');
   }

   public getMsgState() {
      return this.data.get('msgstate');
   }

   public getPresence() {
      return this.data.get('msgstate');
   }

   public getType() {
      return this.data.get('type');
   }

   public getNumberOfUnreadMessages():number {

   }

   public getName():string {
      return this.data.get('name') || this.jid.bare;
   }

   public getAvatar():Promise {

   }

   public getSubscription() {
      return this.data.get('subscription');
   }

   public getCapabilitiesByRessource():Promise<{}> {
      // @TODO
      return Promise.resolve({});
   }

   public getVcard():Promise<{}> {
      return this.account.getConnection().loadVcard(this.getJid());
   }

   public isEncrypted() {

   }

   public setTrust(trust:boolean) {
      this.data.set('trust', trust);
   }

   public setName(name:string) {
      this.data.set('name', name);

      //@TODO call connection.setDisplayname
   }

   public registerHook(property:string, func:(newValue:any, oldValue:any)=>void) {
      this.data.registerHook(property, func);
   }

   private getHighestStatus() {
      let maxStatus = 0;
      let resources = this.data.get('resources');

      for (let resource in resources) {
         if(resources[resource] > maxStatus) {
            maxStatus = resources[resource];
         }
      }

      return maxStatus;
   }
}
