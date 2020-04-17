import Account from '../Account'
import Client from '../Client'
import Storage from '../Storage'
import Contact from '../Contact'
import Message from '../Message'
import JID from '../JID'
import DiscoInfoRepository from '../DiscoInfoRepository'
import Avatar from '../Avatar'
import { IMessagePayload, DIRECTION, IMessage } from '../Message.interface'
import { IPluginAPI } from './PluginAPI.interface'
import { Logger } from '../util/Log'
import ChatWindow from '@ui/ChatWindow';
import ContactProvider from '@src/ContactProvider';
import { IContact } from '@src/Contact.interface';
import { IJID } from '@src/JID.interface';
import MultiUserContact from '@src/MultiUserContact';
import ContactManager from '@src/ContactManager';
import IStorage from '@src/Storage.interface';

export default class PluginAPI implements IPluginAPI {
   private storage: IStorage;

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
   public createMessage(data: IMessagePayload): Message
   public createMessage() {
      return new Message(arguments[0]);
   }

   public createMultiUserContact(jid: IJID, name?: string): MultiUserContact
   public createMultiUserContact(id: string): MultiUserContact
   public createMultiUserContact(): MultiUserContact {
      return new MultiUserContact(this.account, arguments[0], arguments[1]);
   }

   public getStorage(): IStorage {
      if (typeof this.storage === 'undefined') {
         this.storage = new Storage(this.account.getUid() + ':plugin:' + this.name);
      }

      return this.storage;
   }

   public getSessionStorage(): IStorage {
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

   public addPreSendMessageProcessor(processor: (contact: IContact, message: Message) => Promise<[IContact, Message]>, position?: number) {
      this.account.getPipe('preSendMessage').addProcessor(processor, position);
   }

   public addAfterReceiveMessageProcessor(processor: (contact: IContact, message: IMessage, stanza: Element) => Promise<[IContact, IMessage, Element]>, position?: number) {
      this.account.getPipe('afterReceiveMessage').addProcessor(processor, position);
   }

   public addAfterReceiveGroupMessageProcessor(processor: (contact: IContact, message: IMessage, stanza: Element) => Promise<[IContact, IMessage, Element]>, position?: number) {
      this.account.getPipe('afterReceiveGroupMessage').addProcessor(processor, position);
   }

   public addPreSendMessageStanzaProcessor(processor: (message: Message, xmlMsg: Strophe.Builder) => Promise<[Message, Strophe.Builder]>, position?: number) {
      this.account.getPipe('preSendMessageStanza').addProcessor(processor, position);
   }

   public addAvatarProcessor(processor: (contact: IContact, avatar: Avatar) => Promise<[IContact, Avatar]>, position?: number) {
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

   public registerTextFormatter(formatter: (text: string, direction: DIRECTION, contact: IContact, senderName: string) => Promise<string> | string, priority?: number) {
      Message.addFormatter((text: string, direction: DIRECTION, peer: IJID, senderName: string) => {
         return Promise.resolve(formatter(text, direction, this.account.getContact(peer), senderName)).then(text => [text, direction, peer, senderName]);
      }, priority);
   }

   public getContactManager(): ContactManager {
      return this.account.getContactManager();
   }

   public getAfterReceiveGroupMessagePipe() {
      return this.account.getPipe('afterReceiveGroupMessage');
   }

   public getAfterReceiveMessagePipe() {
      return this.account.getPipe('afterReceiveMessage');
   }
}
