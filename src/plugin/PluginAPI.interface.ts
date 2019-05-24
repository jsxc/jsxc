import { IConnection } from '../connection/Connection.interface'
import { IContact as Contact } from '../Contact.interface'
import { IMessage, IMessagePayload } from '../Message.interface'
import { IJID as JID } from '../JID.interface'
import { IDiscoInfoRepository } from '../DiscoInfoRepository.interface'
import { ILog } from '../util/Log.interface'
import ChatWindow from '@ui/ChatWindow';
import ContactManager from '@src/ContactManager';
import ContactProvider from '@src/ContactProvider';
import { IAvatar } from '@src/Avatar.interface';
import Pipe from '@util/Pipe';

export interface IPluginAPI {

   Log: ILog

   createJID(node: string, domain: string, resource: string): JID
   createJID(bare: string, resource: string): JID
   createJID(full: string): JID

   createMessage(uid: string): IMessage
   createMessage(data: IMessagePayload): IMessage

   getStorage()

   getSessionStorage()

   send(stanzaElement: Strophe.Builder)

   sendIQ(stanzaElement: Strophe.Builder): Promise<{}>

   getDiscoInfoRepository(): IDiscoInfoRepository

   getConnection(): IConnection

   getContact(jid: JID): Contact

   getVersion(): string

   addPreSendMessageProcessor(processor: (contact: Contact, message: IMessage) => Promise<{}>, position?: number)

   addAfterReceiveMessageProcessor(processor: (contact: Contact, message: IMessage, stanza: Element) => Promise<{}>, position?: number)

   addPreSendMessageStanzaProcessor(processor: (message: IMessage, xmlMsg: Strophe.Builder) => Promise<any>, position?: number)

   addAvatarProcessor(processor: (contact: Contact, avatar: IAvatar) => Promise<[Contact, IAvatar]>, position?: number)

   addFeature(feature: string)

   registerConnectionHook(func: (status: number, condition?: string) => void)

   registerPresenceHook(func)

   getConnectionCreationDate(): Date

   registerChatWindowInitializedHook(hook: (chatWindow: ChatWindow) => void)

   registerContactProvider(source: ContactProvider)

   getContactManager(): ContactManager

   getAfterReceiveGroupMessagePipe(): Pipe

   getAfterReceiveMessagePipe(): Pipe
}
