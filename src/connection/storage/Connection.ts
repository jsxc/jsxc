import JID from '../../JID';
import Message from '../../Message';
import {IConnection} from '../ConnectionInterface';

export default class StorageConnection implements IConnection {
   private constructor() {

   }

   public loadVcard(jid:JID):any {

   };

   public getCapabilitiesByJid(jid:JID):any {

   };

   public addBuddy(jid:JID, alias:string) {

   };

   public removeBuddy(jid:JID) {

   };

   public sendMessage(message:Message) {

   }

   public hasFeatureByJid(jid:JID, feature:string);
   public hasFeatureByJid(jid:JID, feature:string[]);
   public hasFeatureByJid() {

   }
}
