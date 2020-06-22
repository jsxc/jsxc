import { Strophe } from 'strophe.js'
import Log from '../../util/Log'
import SM from '../../StateMachine'
import Client from '../../Client'
import InvalidParameterError from '../../errors/InvalidParameterError'
import ConnectionError from '../../errors/ConnectionError'
import AuthenticationError from '../../errors/AuthenticationError'
import UUID from '@util/UUID';

export function login(url: string, jid: string, sid: string, rid: string);
export function login(url: string, jid: string, password: string);
export function login() {
   if (arguments.length === 3) {
      return loginWithPassword(arguments[0], arguments[1], arguments[2]);
   } else if (arguments.length === 4) {
      return attachConnection(arguments[0], arguments[1], arguments[2], arguments[3]);
   } else {
      Log.warn('This should not happen');
   }
}

function loginWithPassword(url: string, jid: string, password: string): Promise<{}> {
   testBasicConnectionParameters(url, jid);
   let connection = prepareConnection(url);

   Log.debug('Try to establish a new connection.');

   if (jid.indexOf('/') < 0) {
      jid += '/jsxc-' + UUID.v4().slice(0, 8);
   }

   return new Promise(function(resolve, reject) {
      connection.connect(jid, password, function(status, condition) {
         resolveConnectionPromise(status, condition, connection, resolve, reject);
      });
   });
}

function attachConnection(url: string, jid: string, sid: string, rid: string) {
   testBasicConnectionParameters(url, jid);
   let connection = prepareConnection(url);

   Log.debug('Try to attach old connection.');

   return new Promise(function(resolve, reject) {
      connection.attach(jid, sid, rid, function(status, condition) {
         resolveConnectionPromise(status, condition, connection, resolve, reject);
      });
   })
}

function resolveConnectionPromise(status, condition, connection, resolve, reject) {
   switch (status) {
      case Strophe.Status.DISCONNECTED:
      case Strophe.Status.CONNFAIL:
         reject(new ConnectionError(condition));
         break;
      case Strophe.Status.AUTHFAIL:
         reject(new AuthenticationError(condition));
         break;
      case Strophe.Status.ATTACHED:
         // flush connection in order we reuse a rid
         connection.flush();
         setTimeout(() => {
            // attached doesn't mean the connection is working, but if something
            // is wrong the server will immediately response with a connection failure.
            resolve({
               connection,
               status,
               condition
            });
         }, 1000);
         break;
      case Strophe.Status.CONNECTED:
         resolve({
            connection,
            status,
            condition
         });
         break;
      default:
         Log.debug('Strophe Connection Status: ', Object.keys(Strophe.Status)[status]);
   }
}

function testBasicConnectionParameters(url: string, jid: string) {
   if (!jid) {
      throw new InvalidParameterError('I can not log in without a jid.');
   }

   if (!url) {
      throw new InvalidParameterError('I can not log in without an URL.');
   }
}

function prepareConnection(url: string): Strophe.Connection {
   let connection = new Strophe.Connection(url, <any> {
      mechanisms: [
         (<any> Strophe).SASLAnonymous,
         (<any> Strophe).SASLExternal,
         (<any> Strophe).SASLPlain,
         (<any> Strophe).SASLSHA1
      ]
   });

   if (Client.isDebugMode()) {
      connection.xmlInput = function(data) {
         Log.debug('<', data);
      };
      connection.xmlOutput = function(data) {
         Log.debug('>', data);
      };
   }

   SM.changeState(SM.STATE.ESTABLISHING);

   return connection;
}
