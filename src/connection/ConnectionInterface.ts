import JID from './../JID';
import Message from './../Message';
import {Presence} from './AbstractConnection'

export interface IConnection {
   getJID():JID;

   loadVcard(jid:JID):any;

   getCapabilitiesByJid(jid:JID):any;

   getJingleHandler();

   addContact(jid:JID, alias:string);

   removeContact(jid:JID);

   sendMessage(message:Message);

   sendPresence(presence?:Presence);

   getAvatar(jid:JID);

   setDisplayName(jid:JID, displayName:string);

   hasFeatureByJid(jid:JID, feature:string);
   hasFeatureByJid(jid:JID, feature:string[]);

   getRoster();

   logout();

   close();

   getDiscoInfo(jid:JID, node?:string);
   getDiscoItems(jid:JID, node?:string);

   send(stanzaElement:Element);
   send(stanzaElement:Strophe.Builder);

   sendIQ(stanzaElement:Element):Promise<{}>;
   sendIQ(stanzaElement:Strophe.Builder):Promise<{}>;

   registerHandler(handler:(stanza:string)=>boolean, ns?:string, name?:string, type?:string, id?:string, from?:string);
}
