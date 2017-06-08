import {$iq,Strophe} from 'strophe.js';
import Options from '../../Options';
import Log from '../../util/Log';
import SM from '../../StateMachine'

export function login(url:string, jid:string, sid:string, rid:string);
export function login(url:string, jid:string, password:string);
export function login() {
   if (arguments.length === 3) {
      return loginWithPassword(arguments[0], arguments[1], arguments[2]);
   } else if (arguments.length === 4) {
      return attachConnection(arguments[0], arguments[1], arguments[2], arguments[3]);
   } else {
      Log.warn('This should not happen');
      //@TODO this should be moved to some connection parameter detection method
      // let jid;
      // let storage = StorageSingleton.getGlobalStorage();
      //
      // let sid = storage.getItem('sid');
      // let rid = storage.getItem('rid');
      //
      // if (sid !== null && rid !== null) {
      //    jid = storage.getItem('jid');
      // } else {
      //    let xmppOptions = Options.get('xmpp') || {};
      //
      //    sid = xmppOptions.sid || null;
      //    rid = xmppOptions.rid || null;
      //    jid = xmppOptions.jid;
      // }
      //
      // return attachConnection(arguments[0], jid, sid, rid);
   }
}

function loginWithPassword(url:string, jid:string, password:string):Promise<{}> {
   testBasicConnectionParameters(url, jid);
   let connection = prepareConnection(url);

   Log.debug('Try to establish a new connection.');

   return new Promise(function(resolve, reject) {
      //@TODO don't forget password from options
      connection.connect(jid, password, function(status){
         if(status === Strophe.Status.CONNFAIL || status === Strophe.Status.AUTHFAIL) {
            reject.call(this, {
               connection: connection,
               status: status
            });
         } else if(status === Strophe.Status.CONNECTED) {
            resolve.call(this, {
               connection: connection,
               status: status
            });
         }

         connectionCallback.apply(this, arguments);
      });
   });
}

function attachConnection(url:string, jid:string, sid:string, rid:string) {
   testBasicConnectionParameters(url, jid);
   let connection = prepareConnection(url);

   Log.debug('Try to attach old connection.');

   // jsxc.reconnect = true;

   return new Promise(function(resolve, reject) {
      connection.attach(jid, sid, rid, function(status){
         if(status === Strophe.Status.CONNFAIL || status === Strophe.Status.AUTHFAIL) {
            reject.call(this, {
               connection: connection,
               status: status
            });
         } else if(status === Strophe.Status.ATTACHED) {
            resolve.call(this, {
               connection: connection,
               status: status
            });
         }

         connectionCallback.apply(this, arguments);
      });
   })
}

function testBasicConnectionParameters(url:string, jid:string) {
   if (!jid)
      throw new Error('I can not log in without a jid.');

   if (!url)
      throw new Error('I can not log in without an URL.');
}

function registerXMPPNamespaces() {
   Strophe.addNamespace('RECEIPTS', 'urn:xmpp:receipts');
}

function prepareConnection(url:string):Strophe.Connection {
   let connection = new Strophe.Connection(url);

   if (Options.get('debug')) {
      connection.xmlInput = function(data) {
         Log.debug('<', data);
      };
      connection.xmlOutput = function(data) {
         Log.debug('>', data);
      };
   }

   // connection.nextValidRid = onRidChange;

   if (connection.caps) {
      connection.caps.node = 'http://jsxc.org/';
   }

   SM.changeState(SM.STATE.ESTABLISHING);

   return connection;
}

function connectionCallback(status, condition) {

   Log.debug(Object.getOwnPropertyNames(Strophe.Status)[status] + ': ' + condition);

   switch (status) {
      case Strophe.Status.CONNECTING:
         $(document).trigger('connecting.jsxc');
         break;
      case Strophe.Status.CONNECTED:
         //jsxc.bid = jsxc.jidToBid(jsxc.xmpp.conn.jid.toLowerCase());
         $(document).trigger('connected.jsxc');
         break;
      case Strophe.Status.ATTACHED:
         $(document).trigger('attached.jsxc');
         break;
      case Strophe.Status.DISCONNECTED:
         $(document).trigger('disconnected.jsxc');
         break;
      case Strophe.Status.CONNFAIL:
         $(document).trigger('connfail.jsxc');
         break;
      case Strophe.Status.AUTHFAIL:
         $(document).trigger('authfail.jsxc');
         break;
   }
}
