import JID from './../JID';
import Message from './../Message';
import {Presence} from './AbstractConnection'

export interface IConnection {
   loadVcard(jid:JID):any;

   getCapabilitiesByJid(jid:JID):any;

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
}
