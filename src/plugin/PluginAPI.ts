import Account from '../Account'
import Client from '../Client'
import Storage from '../Storage'
import Contact from '../Contact'
import Message from '../Message'
import JID from '../JID'
import DiscoInfoRepository from '../DiscoInfoRepository'
import Avatar from '../Avatar'
import { MessagePayload } from '../Message.interface'
import { API as IPluginAPI } from './PluginAPI.interface'
import { Logger } from '../util/Log'
import ChatWindow from '@ui/ChatWindow';
import ContactProvider from '@src/ContactProvider';
import { IContact } from '@src/Contact.interface';
import { IJID } from '@src/JID.interface';
import MultiUserContact from '@src/MultiUserContact';
import ContactManager from '@src/ContactManager';

export default class PluginAPI implements IPluginAPI {
   private storage;

   private sessionStorage;

   public Log;

   constructor(private name: string, private account: Account) {
      this.Log = new Logger(name);
   }

   public createJID(node: string, domain: string, resource: string): IJID
   public createJID(bare: string, resource: string): IJID
   public createJID(full: string): IJID
   public createJID(): IJID {
      return new JID(arguments[0], arguments[1], arguments[2]);
   }

   public createMessage(uid: string): Message
   public createMessage(data: MessagePayload): Message
   public createMessage() {
      return new Message(arguments[0]);
   }

   public createMultiUserContact(jid: IJID, name?: string): MultiUserContact
   public createMultiUserContact(id: string): MultiUserContact
   public createMultiUserContact(): MultiUserContact {
      return new MultiUserContact(this.account, arguments[0], arguments[1]);
   }

   public getStorage(): Storage {
      if (typeof this.storage === 'undefined') {
         this.storage = new Storage(this.account.getUid() + ':plugin:' + this.name);
      }

      return this.storage;
   }

   public getSessionStorage(): Storage {
      if (typeof this.sessionStorage === 'undefined') {
         //@REVIEW maybe also encapsulate session storage for every plugin
         this.sessionStorage = this.account.getSessionStorage();
      }

      return this.sessionStorage;
   }

   public send = (stanzaElement: Strophe.Builder) => {
      this.getConnection().pluginOnlySend(stanzaElement);
   }

   public sendIQ = (stanzaElement: Strophe.Builder): Promise<{}> => {
      return this.getConnection().pluginOnlySendIQ(stanzaElement);
   }

   public getDiscoInfoRepository(): DiscoInfoRepository {
      return this.account.getDiscoInfoRepository();
   }

   public getConnection() {
      return this.account.getConnection();
   }

   public getContact(jid: IJID): IContact {
      return this.account.getContact(jid);
   }

   public getVersion() {
      return Client.getVersion();
   }

   public addPreSendMessageProcessor(processor: (contact: Contact, message: Message) => Promise<{}>, position?: number) {
      this.account.getPipe('preSendMessage').addProcessor(processor, position);
   }

   public addAfterReceiveMessageProcessor(processor: (contact: Contact, message: Message, stanza: Element) => Promise<{}>, position?: number) {
      this.account.getPipe('afterReceiveMessage').addProcessor(processor, position);
   }

   public addPreSendMessageStanzaProcessor(processor: (message: Message, xmlMsg: Strophe.Builder) => Promise<any>, position?: number) {
      this.account.getPipe('preSendMessageStanza').addProcessor(processor, position);
   }

   public addAvatarProcessor(processor: (contact: Contact, avatar: Avatar) => Promise<[Contact, Avatar]>, position?: number) {
      this.account.getPipe('avatar').addProcessor(processor, position);
   }

   public addFeature(feature: string) {
      this.account.getDiscoInfo().addFeature(feature);
   }

   public registerConnectionHook(func: (status: number, condition?: string) => void) {
      this.account.registerConnectionHook(func);
   }

   public registerPresenceHook(func) {
      this.account.registerPresenceHook(func);
   }

   public getConnectionCreationDate(): Date {
      let storage = this.account.getSessionStorage();
      let created = storage.getItem('connection', 'created');

      if (created) {
         return new Date(created);
      }

      return null;
   }

   public registerChatWindowInitializedHook(hook: (chatWindow?: ChatWindow, contact?: Contact) => void) {
      this.account.registerChatWindowInitializedHook(hook);
   }

   public registerChatWindowClearedHook(hook: (chatWindow?: ChatWindow, contact?: Contact) => void) {
      this.account.registerChatWindowClearedHook(hook);
   }

   public registerContactProvider(source: ContactProvider) {
      this.account.getContactManager().registerContactProvider(source);
   }

   public getContactManager(): ContactManager {
      return this.account.getContactManager();
   }
}
