import { IConnection } from '../connection/Connection.interface'
import { IContact as Contact } from '../Contact.interface'
import { IMessage as Message, MessagePayload } from '../Message.interface'
import { IJID as JID } from '../JID.interface'
import { Avatar } from '../Avatar.interface'
import { DiscoInfoRepository } from '../DiscoInfoRepository.interface'

export interface API {

   //constructor(name: string, account: Account)

   createJID(node: string, domain: string, resource: string): JID
   createJID(bare: string, resource: string): JID
   createJID(full: string): JID

   createMessage(uid: string): Message
   createMessage(data: MessagePayload): Message

   getStorage()

   getSessionStorage()

   send(stanzaElement: Strophe.Builder)

   sendIQ(stanzaElement: Strophe.Builder): Promise<{}>

   getDiscoInfoRepository(): DiscoInfoRepository

   getConnection(): IConnection

   getContact(jid: JID): Contact

   getVersion(): string

   addPreSendMessageProcessor(processor: (contact: Contact, message: Message) => Promise<{}>, position?: number)

   addAfterReceiveMessageProcessor(processor: (contact: Contact, message: Message) => Promise<{}>, position?: number)

   addPreSendMessageStanzaProcessor(processor: (message: Message, xmlMsg: Strophe.Builder) => Promise<any>, position?: number)

   addAvatarProcessor(processor: (contact: Contact, avatar: Avatar) => Promise<[Contact, Avatar]>, position?: number)

   addFeature(feature: string)

   registerConnectionHook(func: (status: number, condition?: string) => void)

   registerPresenceHook(func)

   getConnectionCreationDate(): Date
}
