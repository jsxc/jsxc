import Account from '../../Account'
import PersistentMap from '../../util/PersistentMap'
import Log from '../../util/Log'
import JID from '../../JID'
import * as ConnectHelper from './ConnectHelper'
import StorageConnection from '../storage/Connection'
import XMPPConnection from './Connection'
import { Strophe } from '../../vendor/Strophe'
import BaseError from '../../errors/BaseError'

export default class Connector {
   private connectionParameters;

   private connectionArgs: string[];

   constructor(account: Account, boshUrl: string, jid: string, sid: string, rid: string);
   constructor(account: Account, boshUrl: string, jid: string, password: string);
   constructor(account: Account);
   constructor(private account: Account, ...connectionArgs: string[]) {
      let storage = account.getStorage();
      this.connectionParameters = new PersistentMap(storage, 'connection');

      connectionArgs = connectionArgs.filter(arg => typeof arg === 'string');

      if (connectionArgs.length < 3) {
         this.connectionArgs = [
            this.connectionParameters.get('url'),
            this.connectionParameters.get('jid'),
            this.connectionParameters.get('sid'),
            this.connectionParameters.get('rid')
         ];
      } else if (connectionArgs.length === 3 || connectionArgs.length === 4) {
         this.connectionArgs = connectionArgs;

         this.connectionParameters.remove('inactivity');
         this.connectionParameters.remove('timestamp');
      } else {
         throw new BaseError('Unsupported number of arguments');
      }
   }

   public connect() {
      let inactivity = this.connectionParameters.get('inactivity');
      let timestamp = this.connectionParameters.get('timestamp');
      let isConnectionExpired = inactivity && timestamp && (new Date()).getTime() - timestamp > inactivity;

      if (isConnectionExpired) {
         console.log(`Inactivity: ${inactivity}, Last timestamp: ${timestamp}, Time diff: ${(new Date()).getTime() - timestamp}`);
         Log.warn('Credentials expired')

         this.account.triggerConnectionHook(Strophe.Status.CONNTIMEOUT);
         this.account.triggerConnectionHook(Strophe.Status.DISCONNECTED, 'timeout');
         this.account.closeAllChatWindows();

         throw new BaseError('Credentials expired');
      }

      return ConnectHelper.login.apply(this, this.connectionArgs)
         .then(this.successfulConnected);
   }

   public getJID(): JID {
      return new JID(this.connectionParameters.get('jid'));
   }

   public getUrl(): string {
      return this.connectionParameters.get('url');
   }

   private successfulConnected = (data) => {
      let stropheConnection = data.connection;
      let status = data.status;
      let condition = data.condition;

      this.storeConnectionParameters(stropheConnection);
      this.replaceConnectionHandler(stropheConnection);
      this.addRidHandler(stropheConnection);
      this.addRidUnloadHandler(stropheConnection);

      let accountConnection = this.account.getConnection();
      let handlers = (<StorageConnection>accountConnection).getHandlers();

      accountConnection.close();
      accountConnection = new XMPPConnection(this.account, stropheConnection);

      for (let handler of handlers) {
         accountConnection.registerHandler.apply(accountConnection, handler);
      }

      if (stropheConnection.features) {
         this.storeConnectionFeatures(stropheConnection);
      }

      Log.debug('XMPP connection ready');

      this.account.triggerConnectionHook(status, condition);

      return [status, accountConnection];
   }

   private storeConnectionParameters(connection) {
      this.connectionParameters.set({
         url: connection.service,
         jid: connection.jid,
         sid: connection._proto.sid,
         rid: connection._proto.rid,
         timestamp: (new Date()).getTime()
      });

      if (connection._proto.inactivity) {
         let inactivity = connection._proto.inactivity * 1000;

         this.connectionParameters.set('inactivity', inactivity);
      }
   }

   private replaceConnectionHandler(connection) {
      connection.connect_callback = (status, condition) => {
         this.account.triggerConnectionHook(status, condition);

         if (status === Strophe.Status.DISCONNECTED) {
            this.account.connectionDisconnected();
         }
      }
   }

   private addRidHandler(connection) {
      connection.nextValidRid = (rid) => {
         let timestamp = (new Date()).getTime();

         this.connectionParameters.set('timestamp', timestamp);
         this.connectionParameters.set('rid', rid);
      };
   }

   private addRidUnloadHandler(connection) {
      $(window).on('unload', () => {
         connection.nextValidRid(connection._proto.rid);
      });
   }

   private storeConnectionFeatures(connection) {
      let from = new JID('', connection.domain, '');
      let stanza = connection.features;

      let capsElement = stanza.querySelector('c');
      let ver = capsElement.getAttribute('ver');
      let node = capsElement.getAttribute('node');

      let discoInfoRepository = this.account.getDiscoInfoRepository();
      discoInfoRepository.addRelation(from, ver);
   }
}
