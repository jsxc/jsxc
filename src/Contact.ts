import Storage from './Storage'
import JID from './JID'
import Message from './Message'
import Notification from './Notification'
import Translation from './util/Translation'
import Account from './Account'
import ContactData from './ContactData'
import PersistentMap from './PersistentMap'
import IdentifiableInterface from './IdentifiableInterface'
import Log from './util/Log'
import {Presence} from './connection/AbstractConnection'

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
         let id = arguments[1]; console.log('id', id)
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

   public delete() {
      this.account.getConnection().removeContact(this.getJid());

      //@TODO add delete method to purge the complete entry
      this.data.empty();

      //@TODO purge window
   }

   public openWindow = () => {
      return this.account.openChatWindow(this);
   }

   public addResource(resource:string) {
      let resources = this.data.get('resources') || [];

      if (resource && resources.indexOf(resource) < 0) {
         resources.push(resource);

         this.data.set('resources', resources);
      }
   }

   public removeResource(resource:string) {
      let resources = this.data.get('resources') || [];

      resources = $.grep(resources, function(r) {
         return resource !== r;
      });

      this.data.set('resources', resources);
   }

   public setResource = (resource:string) => {
      //this.addResource(resource);
console.log('setResource', this.jid.bare + '/' + resource)
      this.jid = new JID(this.jid.bare + '/' + resource);

      this.data.set('jid', this.jid.full);
   }

   public setPresence(resource:string, presence:Presence) {
      Log.debug('set presence for ' + this.jid.bare + ' / ' + resource, presence);

      let resources = this.data.get('resources') || {};

      if (presence === Presence.offline) {
         if (resource) {
            delete resources[resource];
         } else {
            resources = {};
         }
      } else if (resource) {
         resources[resource] = presence;
      }

      if (this.getType() === 'groupchat') {
         // group chat doesn't have a presence
         return;
      }

      presence = this.getHighestPresence();
console.log('highest presence', presence);
      if (this.data.get('presence') === Presence.offline && presence !== Presence.offline) {
         // buddy has come online
         // @TODO
         // Notification.notify({
         //    title: this.getName(),
         //    message: Translation.t('has_come_online'),
         //    source: this.getId()
         // });
      }

      this.data.set('presence', presence);
   }

   public sendMessage(message:Message) {
      // message.bid = this.getId();
   }

   public getCapableResources(features) {
      let resources = Object.keys(this.data.get('resources'));

      if (!features) {
         return resources;
      } else if (typeof features === 'string') {
         features = [features];
      }

      let capableResources = [];
      $.each(resources, function(i, resource) {
         if (self.conn.caps.hasFeatureByJid(this.getJID().bare + '/' + resource, features)) {
            capableResources.push(resource);
         }
      });

      return capableResources;
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
      return this.data.get('presence');
   }

   public getType() {
      return this.data.get('type');
   }

   public getNumberOfUnreadMessages():number {

   }

   public getName():string {
      return this.data.get('name') || this.jid.bare;
   }

   public getAvatar():Promise<{}> {

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

   public getStatus():string {
      return this.data.get('status');
   }

   public setStatus(status:string) { console.trace(this.getId() + ', setStatus: ' + status)
      return this.data.set('status', status);
   }

   public setTrust(trust:boolean) {
      this.data.set('trust', trust);
   }

   public setName(name:string) {
      let oldName = this.getName();

      this.data.set('name', name);

      if (oldName !== name) {
         this.account.getConnection().setDisplayName(this.jid, name);
      }
   }

   public setSubscription(subscription:string) {
      this.data.set('subscription', subscription);
   }

   public registerHook(property:string, func:(newValue:any, oldValue:any)=>void) {
      this.data.registerHook(property, func);
   }

   private getHighestPresence() {
      let maxPresence = Presence.offline;
      let resources = this.data.get('resources');

      for (let resource in resources) {
         if(resources[resource] < maxPresence) {
            maxPresence = resources[resource];
         }
      }

      return maxPresence;
   }
}
