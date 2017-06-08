import JID from './../JID';
import Message from './../Message';

export interface IConnection {
   loadVcard(jid:JID):any;

   getCapabilitiesByJid(jid:JID):any;

   addContact(jid:JID, alias:string);

   removeContact(jid:JID);

   sendMessage(message:Message);

   sendPresence();

   getAvatar(jid:JID);

   hasFeatureByJid(jid:JID, feature:string);
   hasFeatureByJid(jid:JID, feature:string[]);

   getRoster();

   logout();
}
