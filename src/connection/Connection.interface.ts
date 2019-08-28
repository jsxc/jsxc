import { IJID } from './../JID.interface'
import Message from './../Message'
import { Presence } from './AbstractConnection'
import Form from './Form'
import PEPService from './services/PEP'
import PubSubService from './services/PubSub'
import 'Strophe'
import JingleHandler from './JingleHandler';

export interface IConnection {
   registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string);

   pluginOnlySend(stanzaElement: Element);
   pluginOnlySend(stanzaElement: Strophe.Builder);

   pluginOnlySendIQ(stanzaElement: Element): Promise<Element>;
   pluginOnlySendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   getPubSubService(): PubSubService

   getPEPService(): PEPService

   getMUCService(): IMUCService

   getRosterService(): IRosterService

   getVcardService(): IVcardService

   getDiscoService(): IDiscoService

   getJingleHandler(): JingleHandler

   getJID(): IJID

   sendMessage(message: Message)

   sendPresence(presence?: Presence)

   queryArchive(archive: IJID, version: string, queryId: string, contact?: IJID, beforeResultId?: string, end?: Date): Promise<Element>

   changePassword(newPassword: string): Promise<Element>

   close()
}

export interface IMUCService {
   joinMultiUserRoom(jid: IJID, password?: string)

   leaveMultiUserRoom(jid: IJID, exitMessage?: string)

   destroyMultiUserRoom(jid: IJID): Promise<Element>

   createInstantRoom(jid: IJID): Promise<Element>

   getRoomConfigurationForm(jid: IJID): Promise<Element>

   submitRoomConfiguration(jid: IJID, form: Form): Promise<Element>

   cancelRoomConfiguration(jid: IJID): Promise<Element>

   sendMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string)

   declineMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string)

   sendDirectMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string, password?: string)
}

export interface IRosterService {
   getRoster(verstion?: string)

   removeContact(jid: IJID): Promise<Element>

   addContact(jid: IJID, alias: string): Promise<Element>

   setDisplayName(jid: IJID, displayName: string, groups: string[]): Promise<Element>

   sendSubscriptionAnswer(to: IJID, accept: boolean)
}

export interface IVcardService {
   loadVcard(jid: IJID)
}

export interface IDiscoService {
   getDiscoInfo(jid: IJID, node?: string): Promise<Element>

   getDiscoItems(jid: IJID, node?: string): Promise<Element>
}
