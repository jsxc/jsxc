import { IContact, ContactType, ContactSubscription } from './Contact.interface'
import Storage from './Storage'
import JID from './JID'
import Account from './Account'
import PersistentMap from './util/PersistentMap'
import IIdentifiable from './Identifiable.interface'
import Log from './util/Log'
import { Presence } from './connection/AbstractConnection'
import { EncryptionState } from './plugin/AbstractPlugin'
import Transcript from './Transcript'
import ChatWindowController from './ChatWindowController'
import Avatar from './Avatar'
import Pipe from './util/Pipe'
import Message from './Message'
import ChatWindow from './ui/ChatWindow';

export default class Contact implements IIdentifiable, IContact {
   protected storage: Storage;

   protected readonly account: Account;

   protected data: PersistentMap;

   protected jid: JID;

   protected chatWindow;

   protected chatWindowController;

   protected transcript: Transcript;

   constructor(account: Account, jid: JID, name?: string);
   constructor(account: Account, id: string);
   constructor() {
      this.account = arguments[0];
      this.storage = this.account.getStorage();

      if (typeof arguments[1] === 'string') {
         this.initExistingContact(arguments[1]);
      } else {
         this.initNewContact(arguments[1], arguments[2]);
      }

      this.chatWindowController = new ChatWindowController(this, this.data);
   }

   private initExistingContact(id: string) {
      this.data = new PersistentMap(this.storage, 'contact', id);
      this.jid = new JID(this.data.get('jid'));
   }

   private initNewContact(jid: JID, name?: string) {
      this.jid = jid;

      let defaultData = {
         jid: this.jid.full,
         name: name || this.jid.bare,
         presence: Presence.offline,
         status: '',
         subscription: ContactSubscription.NONE,
         resources: {},
         type: ContactType.CHAT,
         rnd: Math.random() // force storage event
      }

      this.data = new PersistentMap(this.storage, 'contact', this.jid.bare);

      this.data.set(defaultData);
   }

   public delete() {
      this.account.getConnection().getRosterService().removeContact(this.getJid());

      this.data.empty();
   }

   public getChatWindow(): ChatWindow {
      if (!this.chatWindow) {
         this.chatWindow = new ChatWindow(this);
      }

      return this.chatWindow;
   }

   public getChatWindowController(): ChatWindowController {
      return this.chatWindowController;
   }

   public getAccount(): Account {
      return this.account;
   }

   public addSystemMessage(messageString: string): Message {
      let message = new Message({
         peer: this.getJid(),
         direction: Message.DIRECTION.SYS,
         plaintextMessage: messageString
      });

      this.getTranscript().pushMessage(message);

      return message;
   }

   public setResource = (resource: string) => {
      this.jid = new JID(this.jid.bare + '/' + resource);

      this.data.set('jid', this.jid.full);
   }

   public setPresence(resource: string, presence: Presence) {
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

      this.data.set('presence', presence);
   }

   public getCapableResources(features: string[]): Promise<Array<string>>
   public getCapableResources(features: string): Promise<Array<string>>
   public getCapableResources(features): Promise<Array<string>> {
      return this.account.getDiscoInfoRepository().getCapableResources(this, features);
   }

   public hasFeatureByRessource(resource: string, features: string[]): Promise<{}>
   public hasFeatureByRessource(resource: string, feature: string): Promise<{}>
   public hasFeatureByRessource(resource, feature) {
      let jid = new JID(this.jid.bare + '/' + resource);

      return this.account.getDiscoInfoRepository().hasFeature(jid, feature);
   }

   public getCapabilitiesByRessource(resource: string): Promise<any> {
      let jid = new JID(this.jid.bare + '/' + resource);

      return this.account.getDiscoInfoRepository().getCapabilities(jid);
   }

   public registerCapableResourcesHook(features: string[], cb: (resources: string[]) => void);
   public registerCapableResourcesHook(features: string, cb: (resources: string[]) => void);
   public registerCapableResourcesHook(features, cb: (resources: string[]) => void) {
      if (typeof features === 'string') {
         features = [features];
      }

      this.getCapableResources(features).then(cb);

      this.registerHook('resources', () => {
         //@REVIEW trigger only on changes
         this.getCapableResources(features).then(cb);
      });
   }

   //@REVIEW this is not unique among accounts, will fail in Avatar.get
   public getId(): string {
      return /*this.account.getUid() + '@' +*/ this.jid.bare;
   }

   public getUid(): string {
      return this.account.getUid() + '@' + this.jid.bare;
   }

   public getJid(): JID {
      return this.jid;
   }

   public getResources(): Array<string> {
      return Object.keys(this.data.get('resources'));
   }

   public getPresence(): Presence {
      return this.data.get('presence');
   }

   public getType(): ContactType {
      return this.data.get('type');
   }

   public getNumberOfUnreadMessages(): number {
      return this.transcript.getNumberOfUnreadMessages();
   }

   public getName(): string {
      return this.data.get('name') || this.jid.bare;
   }

   public getAvatar(): Promise<Avatar> {
      return this.account.getPipe('avatar').run(this, undefined)
         .then(([, avatar]) => {
            if (!avatar) {
               throw 'No avatar available for ' + this.getId();
            }

            return avatar;
         });
   }

   public getSubscription(): ContactSubscription {
      return this.data.get('subscription');
   }

   public getVcard(): Promise<any> {
      return this.account.getConnection().getVcardService().loadVcard(this.getJid());
   }

   public setEncryptionState(state: EncryptionState, source: string) {
      if (state !== EncryptionState.Plaintext && !source) {
         throw 'No encryption source provided';
      }

      this.data.set('encryptionState', state);
      this.data.set('encryptionPlugin', state === EncryptionState.Plaintext ? null : source);
   }

   public getEncryptionState(): EncryptionState {
      return this.data.get('encryptionState') || EncryptionState.Plaintext;
   }

   public getEncryptionPluginName(): string | null {
      return this.data.get('encryptionPlugin') || null;
   }

   public isEncrypted(): boolean {
      return this.getEncryptionState() !== EncryptionState.Plaintext && !!this.getEncryptionPluginName();
   }

   public getTranscript(): Transcript {
      if (!this.transcript) {
         this.transcript = new Transcript(this.storage, this);
      }

      return this.transcript;
   }

   public getStatus(): string {
      return this.data.get('status');
   }

   public setStatus(status: string) {
      return this.data.set('status', status);
   }

   public setName(name: string) {
      let oldName = this.getName();

      this.data.set('name', name);

      if (oldName !== name) {
         this.account.getConnection().getRosterService().setDisplayName(this.jid, name);
      }
   }

   public setSubscription(subscription: ContactSubscription) {
      this.data.set('subscription', subscription);
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      this.data.registerHook(property, func);
   }

   public isPersistent(): boolean {
      return true;
   }

   private getHighestPresence(): Presence {
      let maxPresence = Presence.offline;
      let resources = this.data.get('resources');

      for (let resource in resources) {
         if (resources[resource] < maxPresence) {
            maxPresence = resources[resource];
         }
      }

      return maxPresence;
   }
}
