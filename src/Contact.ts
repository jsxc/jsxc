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
import Message from './Message'
import ChatWindow from './ui/ChatWindow';
import ContactProvider from './ContactProvider';
import DiscoInfo from './DiscoInfo';
import { IJID } from './JID.interface'

export default class Contact implements IIdentifiable, IContact {
   protected storage: Storage;

   protected readonly account: Account;

   protected data: PersistentMap;

   protected id: string;

   protected jid: JID;

   protected chatWindow;

   protected chatWindowController;

   protected transcript: Transcript;

   public static getProviderId(account: Account, id: string) {
      let data = new PersistentMap(account.getStorage(), 'contact', id);

      return data.get('provider');
   }

   constructor(account: Account, jid: IJID, name?: string);
   constructor(account: Account, id: string);
   constructor() {
      this.account = arguments[0];
      this.storage = this.account.getStorage();

      if (typeof arguments[1] === 'string') {
         this.initExistingContact(arguments[1]);
      } else {
         this.initNewContact(arguments[1], arguments[2]);
      }

      this.id = this.data.get('id');
   }

   private initExistingContact(id: string) {
      this.data = new PersistentMap(this.storage, 'contact', id);

      if (!this.data.get('id')) {
         throw new Error(`Could not find existing contact with id "${id}".`);
      }

      this.jid = new JID(this.data.get('jid'));
   }

   private initNewContact(jid: JID, name?: string) {
      let id = jid.bare;
      this.jid = jid;

      let defaultData = {
         id,
         jid: this.jid.full,
         name: name || this.jid.bare,
         presence: Presence.offline,
         status: '',
         subscription: ContactSubscription.NONE,
         resources: {},
         groups: [],
         type: ContactType.CHAT,
         provider: 'fallback',
         rnd: Math.random() // force storage event
      }

      this.data = new PersistentMap(this.storage, 'contact', id);

      this.data.set(defaultData);
   }

   public async delete() {
      this.data.delete();
   }

   public getChatWindow(): ChatWindow {
      if (!this.chatWindow) {
         this.chatWindow = new ChatWindow(this);
      }

      return this.chatWindow;
   }

   public getChatWindowController(): ChatWindowController {
      if (!this.chatWindowController) {
         this.chatWindowController = new ChatWindowController(this, this.data);
      }

      return this.chatWindowController;
   }

   public getAccount(): Account {
      return this.account;
   }

   public addSystemMessage(messageString: string): Message {
      let message = new Message({
         peer: this.getJid(),
         direction: Message.DIRECTION.SYS,
         plaintextMessage: messageString,
         unread: false,
      });

      this.getTranscript().pushMessage(message);

      return message;
   }

   public setResource = (resource: string) => {
      this.jid = new JID(this.jid.bare + '/' + resource);

      this.data.set('jid', this.jid.full);
   }

   public clearResources() {
      this.data.set('resources', {});
   }

   public setPresence(resource: string, presence: Presence) {
      Log.debug('set presence for ' + this.jid.bare + ' / ' + resource, presence);

      if (resource) {
         let resources = this.data.get('resources') || {};

         if (presence === Presence.offline) {
            delete resources[resource];
         } else {
            resources[resource] = presence;
         }

         this.data.set('resources', resources);
      }

      presence = this.getHighestPresence();

      this.data.set('presence', presence);
   }

   public getCapableResources(features: string[]): Promise<string[]>
   public getCapableResources(features: string): Promise<string[]>
   public getCapableResources(features): Promise<string[]> {
      return this.account.getDiscoInfoRepository().getCapableResources(this, features);
   }

   public hasFeatureByResource(resource: string, features: string[]): Promise<{}>
   public hasFeatureByResource(resource: string, feature: string): Promise<{}>
   public hasFeatureByResource(resource, feature) {
      if (!resource) {
         throw new Error('I can not lookup a feature without resource');
      }

      let jid = new JID(this.jid.bare + '/' + resource);

      return this.account.getDiscoInfoRepository().hasFeature(jid, feature);
   }

   public getCapabilitiesByResource(resource: string): Promise<DiscoInfo | void> {
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

   public getId(): string {
      return this.id;
   }

   public getUid(): string {
      return this.account.getUid() + '@' + this.getId();
   }

   public getJid(): JID {
      return this.jid;
   }

   public getResources(): string[] {
      return Object.keys(this.data.get('resources') || {});
   }

   public getPresence(resource?: string): Presence {
      if (resource) {
         let resources = this.data.get('resources') || {};

         return resources[resource];
      }

      return this.data.get('presence');
   }

   public getType(): ContactType {
      return this.data.get('type');
   }

   public isGroupChat() {
      return this.getType() === ContactType.GROUPCHAT;
   }

   public isChat() {
      return this.getType() === ContactType.CHAT;
   }

   public getNumberOfUnreadMessages(): number {
      return this.transcript.getNumberOfUnreadMessages();
   }

   public hasName(): boolean {
      return !!this.data.get('name');
   }

   public getName(): string {
      return this.data.get('name') || this.jid.bare;
   }

   public getProviderId(): string {
      return this.data.get('provider');
   }

   public getAvatar(): Promise<Avatar> {
      return this.account.getPipe('avatar').run(this, undefined)
         .then(([, avatar]) => {
            if (!avatar) {
               throw new Error('No avatar available for ' + this.getId());
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

   public setEncryptionState(state: EncryptionState, sourceId: string) {
      if (state !== EncryptionState.Plaintext && !sourceId) {
         throw new Error('No encryption source provided');
      }
      this.data.set('encryptionPlugin', state === EncryptionState.Plaintext ? null : sourceId);
      this.data.set('encryptionState', state);
   }

   public getEncryptionState(): EncryptionState {
      return this.data.get('encryptionState') || EncryptionState.Plaintext;
   }

   public getEncryptionPluginId(): string | null {
      return this.data.get('encryptionPlugin') || null;
   }

   public isEncrypted(): boolean {
      return this.getEncryptionState() !== EncryptionState.Plaintext && !!this.getEncryptionPluginId();
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
      this.data.set('name', name);
   }

   public setProvider(provider: ContactProvider) {
      this.data.set('provider', provider.getUid());
   }

   public setSubscription(subscription: ContactSubscription) {
      this.data.set('subscription', subscription);
   }

   public setGroups(groups: string[]) {
      this.data.set('groups', groups);
   }

   public getGroups(): string[] {
      return this.data.get('groups') || [];
   }

   public getLastMessageDate(): Date {
      let lastMessage = this.data.get('lastMessage');

      return lastMessage ? new Date(lastMessage) : undefined;
   }

   public setLastMessageDate(lastMessage: Date) {
      this.data.set('lastMessage', lastMessage.toISOString());
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
