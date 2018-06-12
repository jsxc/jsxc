import { IJID } from './../JID.interface'
import Message from './../Message'
import { Presence } from './AbstractConnection'
import Form from './Form'
import PEPService from './services/PEP'
import 'Strophe'

export interface IConnection {
   registerHandler(handler: (stanza: string) => boolean, ns?: string, name?: string, type?: string, id?: string, from?: string);

   pluginOnlySend(stanzaElement: Element);
   pluginOnlySend(stanzaElement: Strophe.Builder);

   pluginOnlySendIQ(stanzaElement: Element): Promise<Element>;
   pluginOnlySendIQ(stanzaElement: Strophe.Builder): Promise<Element>;

   getPEPService(): PEPService

   getJingleHandler()

   getJID(): IJID

   getRoster()

   sendMessage(message: Message)

   sendPresence(presence?: Presence)

   removeContact(jid: IJID): Promise<Element>

   addContact(jid: IJID, alias: string)

   loadVcard(jid: IJID)

   setDisplayName(jid: IJID, displayName: string): Promise<Element>

   sendSubscriptionAnswer(to: IJID, accept: boolean)

   getDiscoInfo(jid: IJID, node?: string): Promise<Element>

   getDiscoItems(jid: IJID, node?: string): Promise<Element>

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

   queryArchive(archive: IJID, queryId: string, beforeResultId?: string, end?: Date): Promise<Element>

   close()
}
