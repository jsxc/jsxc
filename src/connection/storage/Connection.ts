import JID from '../../JID';
import Message from '../../Message';
import {IConnection} from '../ConnectionInterface';
import Log from '../../util/Log'

export default class StorageConnection implements IConnection {
   constructor() {

   }

   public loadVcard(jid:JID):any {
      Log.info('[SC] load vcard');
   };

   public getCapabilitiesByJid(jid:JID):any {
      Log.info('[SC] getCapabilitiesByJid');
   };

   public addContact(jid:JID, alias:string) {
      Log.info('[SC] add contact');
   }

   public removeContact(jid:JID) {
      Log.info('[SC] remove contact');
   }

   public sendMessage(message:Message) {
      Log.info('[SC] send message');
   }

   public sendPresence() {
      Log.info('[SC] send presence');
   }

   public getAvatar(jid:JID) {
      Log.info('[SC] get avatar');
   }

   public hasFeatureByJid(jid:JID, feature:string);
   public hasFeatureByJid(jid:JID, feature:string[]);
   public hasFeatureByJid() {
      Log.info('[SC] has feature by jid');
   }

   public logout() {
      Log.info('[SC] logout');
   }
}
