import Account from '../../Account'
import PersistentMap from '../../util/PersistentMap'
import Log from '../../util/Log'
import JID from '../../JID'
import * as ConnectHelper from './ConnectHelper'
import StorageConnection from '../storage/Connection'
import XMPPConnection from './Connection'
import { Strophe } from '../../vendor/Strophe'
import BaseError from '../../errors/BaseError'

export enum TYPE { BOSH, WEBSOCKET };

export default class Connector {
   private connectionParameters;

   private connectionArgs: string[];

   constructor(account: Account, url: string, jid: string, sid: string, rid: string);
   constructor(account: Account, url: string, jid: string, password: string);
   constructor(account: Account);
   constructor(private account: Account, ...connectionArgs: string[]) {
      let storage = account.getStorage();
      this.connectionParameters = new PersistentMap(storage, 'connection');

      connectionArgs = connectionArgs.filter(arg => typeof arg === 'string');

      if (connectionArgs.length < 3) {
         let type = this.connectionParameters.get('type');

         if (type === TYPE.WEBSOCKET) {
            throw new Error('Cannt attach to websocket connection.');
         }

         this.connectionArgs = [
            this.connectionParameters.get('url'),
            this.connectionParameters.get('jid'),
            this.connectionParameters.get('sid'),
            this.connectionParameters.get('rid')
         ];
      } else if (connectionArgs.length === 3 || connectionArgs.length === 4) {
         this.connectionArgs = connectionArgs;

         let type = /^wss?:/.test(connectionArgs[1]) ? TYPE.WEBSOCKET : TYPE.BOSH;

         this.connectionParameters.set('type', type);
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
         Log.debug(`Inactivity: ${inactivity}, Last timestamp: ${timestamp}, Time diff: ${(new Date()).getTime() - timestamp}`);
         Log.warn('Credentials expired')

         this.account.triggerConnectionHook(Strophe.Status.CONNTIMEOUT);
         this.account.triggerConnectionHook(Strophe.Status.DISCONNECTED, 'timeout');

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

   public getPassword(): string {
      if (this.connectionArgs.length === 3) {
         return this.connectionArgs[2];
      }
   }

   public clearPassword() {
      if (this.connectionArgs.length === 3) {
         delete this.connectionArgs[2];
      }
   }

   private successfulConnected = (data) => {
      let stropheConnection = data.connection;
      let status = data.status;
      let condition = data.condition;

      this.storeConnectionParameters(stropheConnection);
      this.replaceConnectionHandler(stropheConnection);
      this.addRidHandler(stropheConnection);
      this.addRidUnloadHandler(stropheConnection);

      let accountConnection = this.replaceStorageConnectionWithXMPPConnection(stropheConnection);

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

   private replaceStorageConnectionWithXMPPConnection(stropheConnection) {
      let accountConnection = this.account.getConnection();
      let handlers = (<StorageConnection> accountConnection).getHandlers();

      accountConnection.close();
      accountConnection = new XMPPConnection(this.account, stropheConnection);

      for (let handler of handlers) {
         accountConnection.registerHandler.apply(accountConnection, handler);
      }

      return accountConnection;
   }

   private storeConnectionFeatures(connection) {
      let from = new JID('', connection.domain, '');
      let stanza = connection.features;

      if (!stanza) {
         return;
      }

      let capsElement = stanza.querySelector('c');

      if (!capsElement) {
         return;
      }

      let ver = capsElement.getAttribute('ver');

      let discoInfoRepository = this.account.getDiscoInfoRepository();
      discoInfoRepository.addRelation(from, ver);
   }
}
