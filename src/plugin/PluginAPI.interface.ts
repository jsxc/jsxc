import { IConnection } from '../connection/Connection.interface';
import { IContact as Contact, IContact } from '../Contact.interface';
import { IMessage, IMessagePayload, DIRECTION } from '../Message.interface';
import { IJID as JID } from '../JID.interface';
import { IDiscoInfoRepository } from '../DiscoInfoRepository.interface';
import { ILog } from '../util/Log.interface';
import ChatWindow from '@ui/ChatWindow';
import ContactManager from '@src/ContactManager';
import ContactProvider from '@src/ContactProvider';
import { IAvatar } from '@src/Avatar.interface';
import Pipe from '@util/Pipe';
import CommandRepository, { CommandAction } from '@src/CommandRepository';
import IStorage from '@src/Storage.interface';
import CallManager from '@src/CallManager';

export interface IPluginAPI {
   Log: ILog;

   createJID(node: string, domain: string, resource: string): JID;
   createJID(bare: string, resource: string): JID;
   createJID(full: string): JID;

   createMessage(uid: string): IMessage;
   createMessage(data: IMessagePayload): IMessage;

   getStorage(): IStorage;

   getSessionStorage(): IStorage;

   send(stanzaElement: Strophe.Builder);

   sendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   getDiscoInfoRepository(): IDiscoInfoRepository;

   getConnection(): IConnection;

   getContact(jid: JID): Contact;

   getVersion(): string;

   addPreSendMessageProcessor(processor: (contact: Contact, message: IMessage) => Promise<{}>, position?: number);

   addAfterReceiveMessageProcessor(
      processor: (contact: Contact, message: IMessage, stanza: Element) => Promise<{}>,
      position?: number
   );

   addAfterReceiveGroupMessageProcessor(
      processor: (contact: Contact, message: IMessage, stanza: Element) => Promise<[Contact, IMessage, Element]>,
      position?: number
   );

   addAfterReceiveErrorMessageProcessor(
      processor: (contact: Contact, message: IMessage, stanza: Element) => Promise<[Contact, IMessage, Element]>,
      position?: number
   );

   addPreSendMessageStanzaProcessor(
      processor: (message: IMessage, xmlMsg: Strophe.Builder) => Promise<any>,
      position?: number
   );

   addAvatarProcessor(processor: (contact: Contact, avatar: IAvatar) => Promise<[Contact, IAvatar]>, position?: number);

   addCallProcessor(
      processor: (
         contact: IContact,
         type: 'video' | 'audio' | 'screen',
         resources: string[],
         sessionId: string
      ) => Promise<[IContact, 'video' | 'audio' | 'screen', string[], string]>,
      position?: number
   ): void;

   addTerminateCallProcessor(processor: (sessionId?: string) => Promise<[string]>): void;

   addFeature(feature: string);

   registerConnectionHook(func: (status: number, condition?: string) => void);

   registerPresenceHook(func);

   getConnectionCreationDate(): Date;

   registerChatWindowInitializedHook(hook: (chatWindow: ChatWindow) => void);

   registerContactProvider(source: ContactProvider);

   registerTextFormatter(
      formatter: (text: string, direction: DIRECTION, contact: Contact) => Promise<string> | string,
      priority?: number
   );

   getContactManager(): ContactManager;

   getAfterReceiveGroupMessagePipe(): Pipe;

   getAfterReceiveMessagePipe(): Pipe;

   registerCommand(command: string, action: CommandAction, description: string, category?: string): void;

   getCommandRepository(): CommandRepository;

   getAccountUid(): string;

   getCallManager(): CallManager;
}
