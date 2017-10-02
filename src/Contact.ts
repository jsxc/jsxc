import Storage from './Storage'
import JID from './JID'
import Message from './Message'
import Notification from './Notification'
import Translation from './util/Translation'
import Account from './Account'
import PersistentMap from './util/PersistentMap'
import IdentifiableInterface from './IdentifiableInterface'
import Log from './util/Log'
import {Presence} from './connection/AbstractConnection'
import {EncryptionState} from './plugin/AbstractPlugin'
import Client from './Client'
import ChatWindow from './ui/ChatWindow'

export default class Contact implements IdentifiableInterface {
   protected storage: Storage;

   protected readonly account:Account;

   // @REVIEW Data to own object/type?
   protected data:PersistentMap;

   protected jid:JID;

   protected chatWindow;

   constructor(account:Account, jid:JID, name?:string);
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

      this.jid = arguments[1];
      let defaultData = {
         jid: this.jid.full,
         name: arguments[2] || this.jid.bare,
         presence: Presence.offline,
         status: '',
         subscription: 'none',
         msgstate: 0,         //@REVIEW
         trust: false,        //@REVIEW
         fingerprint: null,   //@REVIEW
         resources: {},
         type: 'chat',
         rnd: Math.random() // force storage event
      }

      this.data = new PersistentMap(this.storage, 'contact', this.jid.bare);

      this.data.set(defaultData);
   }

   public delete() {
      this.account.getConnection().removeContact(this.getJid());

      //@TODO add delete method to purge the complete entry
      this.data.empty();

      //@TODO purge window
   }

   public openChatWindow = () => {
      return this.account.addChatWindow(this.getChatWindow());
   }

   public getChatWindow() {
      if(!this.chatWindow) {
         this.chatWindow = new ChatWindow(this.account, this);
      }

      return this.chatWindow;
   }

   public setResource = (resource:string) => {
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

      presence = this.getHighestPresence();

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

   public getCapableResources(features:string[]):Promise<Array<string>>
   public getCapableResources(features:string):Promise<Array<string>>
   public getCapableResources(features):Promise<Array<string>> {
      return this.account.getDiscoInfoRepository().getCapableResources(this, features);
   }

   public hasFeatureByRessource(resource:string, features:string[]):Promise<{}>
   public hasFeatureByRessource(resource:string, feature:string):Promise<{}>
   public hasFeatureByRessource(resource, feature) {
     let jid = new JID(this.jid.bare + '/' + resource);

     return this.account.getDiscoInfoRepository().hasFeature(jid, feature);
   }

   public getCapabilitiesByRessource(resource:string):Promise<any> {
      let jid = new JID(this.jid.bare + '/' + resource);

      return this.account.getDiscoInfoRepository().getCapabilities(jid);
   }

   public registerCapableResourcesHook(features:string[], cb:(resources:string[])=>void);
   public registerCapableResourcesHook(features:string, cb:(resources:string[])=>void);
   public registerCapableResourcesHook(features, cb:(resources:string[])=>void) {
      if (typeof features === 'string') {
         features = [features];
      }

      this.getCapableResources(features).then(cb);

      this.registerHook('resources', () => { console.log('resources changed')
         //@REVIEW trigger only on changes
         this.getCapableResources(features).then(cb);
      });
   }

   //@REVIEW this is not unique among accounts, will fail in Avatar.get
   public getId():string {
      return this.jid.bare;
   }

   public getJid():JID {
      return this.jid;
   }

   public getResources():Array<string> {
     return Object.keys(this.data.get('resources'));
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

   public getVcard():Promise<{}> {
      return this.account.getConnection().loadVcard(this.getJid());
   }

   public isEncrypted() {

   }

   public setEncryptionState(state:EncryptionState) {
      this.data.set('encryptionState', state);
   }

   public getEncryptionState():EncryptionState {
      return this.data.get('encryptionState');
   }

   public getStatus():string {
      return this.data.get('status');
   }

   public setStatus(status:string) {
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
