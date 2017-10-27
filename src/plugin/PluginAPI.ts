import Account from '../Account'
import Client from '../Client'
import Storage from '../Storage'
import Contact from '../Contact'
import Message from '../Message'
import Pipe from '../util/Pipe'
import JID from '../JID'
import {IConnection} from '../connection/ConnectionInterface'
import DiscoInfoRepository from '../DiscoInfoRepository'
import Avatar from '../Avatar'

export default class PluginAPI {
   private storage;

   constructor(private name:string, private account:Account) {

   }

   public getStorage():Storage {
      if (typeof this.storage === 'undefined') {
         this.storage = new Storage(this.account.getUid() + ':plugin:' + this.name);
      }

      return this.storage;
   }

   public send = (stanzaElement:Element|Strophe.Builder) => {
      this.getConnection().pluginOnlySend(stanzaElement);
   }

   public sendIQ = (stanzaElement:Element|Strophe.Builder):Promise<{}> => {
      return this.getConnection().pluginOnlySendIQ(stanzaElement);
   }

   public getDiscoInfoRepository():DiscoInfoRepository {
      return this.account.getDiscoInfoRepository();
   }

   public getConnection() {
      return this.account.getConnection();
   }

   public getContact(jid:JID):Contact {
      return this.account.getContact(jid);
   }

   public getVersion() {
      return Client.getVersion();
   }

   public addPreSendMessageProcessor(processor:(contact:Contact, message:Message)=>Promise<{}>, position?:number) {
      Pipe.get('preSendMessage').addProcessor(processor, position);
   }

   public addAfterReceiveMessageProcessor(processor:(contact:Contact, message:Message)=>Promise<{}>, position?:number) {
      Pipe.get('afterReceiveMessage').addProcessor(processor, position);
   }

   public addAvatarProcessor(processor:(contact:Contact, avatar:Avatar)=>Promise<[Contact, Avatar]>, position?:number) {
      Pipe.get('avatar').addProcessor(processor, position);
   }

   public addFeature(feature:string) {
     this.account.getDiscoInfo().addFeature(feature);
   }
}
