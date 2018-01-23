import { JIDInterface } from './../JIDInterface';
import Message from './../Message';
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

   getJID(): JIDInterface

   getRoster()

   sendMessage(message: Message)

   sendPresence(presence?: Presence)

   removeContact(jid: JIDInterface): Promise<Element>

   addContact(jid: JIDInterface, alias: string)

   loadVcard(jid: JIDInterface)

   setDisplayName(jid: JIDInterface, displayName: string): Promise<Element>

   sendSubscriptionAnswer(to: JIDInterface, accept: boolean)

   getDiscoInfo(jid: JIDInterface, node?: string): Promise<Element>

   getDiscoItems(jid: JIDInterface, node?: string): Promise<Element>

   joinMultiUserRoom(jid: JIDInterface, password?: string)

   leaveMultiUserRoom(jid: JIDInterface, exitMessage?: string)

   destroyMultiUserRoom(jid: JIDInterface): Promise<Element>

   createInstantRoom(jid: JIDInterface): Promise<Element>

   getRoomConfigurationForm(jid: JIDInterface): Promise<Element>

   submitRoomConfiguration(jid: JIDInterface, form: Form): Promise<Element>

   cancelRoomConfiguration(jid: JIDInterface): Promise<Element>

   sendMediatedMultiUserInvitation(receiverJid: JIDInterface, roomJid: JIDInterface, reason?: string)

   declineMediatedMultiUserInvitation(receiverJid: JIDInterface, roomJid: JIDInterface, reason?: string)

   sendDirectMultiUserInvitation(receiverJid: JIDInterface, roomJid: JIDInterface, reason?: string, password?: string)

   queryArchive(archive: JIDInterface, queryId: string, beforeResultId?: string, end?: Date): Promise<Element>

   close()
}
