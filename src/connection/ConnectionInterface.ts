import JID from './../JID';
import Message from './../Message';
import {Presence} from './AbstractConnection'
import Form from './Form'
import 'Strophe'

export interface IConnection {
   registerHandler(handler:(stanza:string)=>boolean, ns?:string, name?:string, type?:string, id?:string, from?:string);

   pluginOnlySend(stanzaElement:Element);
   pluginOnlySend(stanzaElement:Strophe.Builder);

   pluginOnlySendIQ(stanzaElement:Element):Promise<Element>;
   pluginOnlySendIQ(stanzaElement:Strophe.Builder):Promise<Element>;

   getJID():JID

   getRoster()

   sendMessage(message:Message)

   sendPresence(presence?:Presence)

   removeContact(jid:JID):Promise<Element>

   addContact(jid:JID, alias:string)

   loadVcard(jid:JID)

   getAvatar(jid:JID)

   setDisplayName(jid:JID, displayName:string):Promise<Element>

   sendSubscriptionAnswer(to:JID, accept:boolean)

   getDiscoInfo(jid:JID, node?:string):Promise<Element>

   getDiscoItems(jid:JID, node?:string):Promise<Element>

   joinMultiUserRoom(jid:JID, password?:string)

   leaveMultiUserRoom(jid:JID, exitMessage?:string)

   destroyMultiUserRoom(jid:JID):Promise<Element>

   createInstantRoom(jid:JID):Promise<Element>

   getRoomConfigurationForm(jid:JID):Promise<Element>

   submitRoomConfiguration(jid:JID, form:Form):Promise<Element>

   cancelRoomConfiguration(jid:JID):Promise<Element>

   sendMediatedMultiUserInvitation(receiverJid:JID, roomJid:JID, reason?:string)

   declineMediatedMultiUserInvitation(receiverJid:JID, roomJid:JID, reason?:string)

   sendDirectMultiUserInvitation(receiverJid:JID, roomJid:JID, reason?:string, password?:string)

   queryArchive(archive:JID, queryId:string, beforeResultId?:string, end?:Date):Promise<Element>
}
