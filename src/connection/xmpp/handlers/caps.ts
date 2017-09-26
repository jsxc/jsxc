import * as NS from '../namespace'
import DiscoInfo from '../../../DiscoInfo'
import {AbstractConnection} from '../../AbstractConnection';
import Client from '../../../Client'
import JID from '../../../JID'
import Account from '../../../Account'
import Log from '../../../util/Log'
import AbstractHandler from '../AbstractHandler'

export default class CapsHandler extends AbstractHandler {

   public static NAMESPACE = 'http://jabber.org/protocol/caps';

   constructor(account:Account) {
      super(account);

      NS.register('CAPS', CapsHandler.NAMESPACE);

      account.getDiscoInfo().addFeature(NS.get('CAPS'));
   }

   public processStanza(stanza:Element) {
      let from = new JID(stanza.getAttribute('from'));
      let c = stanza.querySelector('c');
      let hash = c.getAttribute('hash');
      let version = c.getAttribute('ver');
      let node = c.getAttribute('node');

      if (!hash) {
         Log.info('Drop caps element, because hash attribute is missing.');
         return this.PRESERVE_HANDLER;
      } else if(hash !== 'sha-1') {
         Log.info('Drop caps element, because we only support sha-1.');
         return this.PRESERVE_HANDLER;

         /* @TODO
         * Send a service discovery information request to the generating entity.
         * Receive a service discovery information response from the generating entity.
         * Do not validate or globally cache the verification string as described below; instead, the processing application SHOULD associate the discovered identity+features only with the JabberID of the generating entity.
         */
      }

      if (!DiscoInfo.exists(version)) {
         this.requestCapabilities(from, node)
         .then((stanza) => {
            this.processDiscoInfo(stanza, version);
         })
         .catch(() => {
            console.log('Something went wrong')
         });
      } else {
         let discoInfo = new DiscoInfo(version);

         this.account.getDiscoInfoRepository().addRelation(from, discoInfo);
      }

      return this.PRESERVE_HANDLER;
   }

   private requestCapabilities(jid:JID, node?:string) {
      let connection = this.account.getConnection();

      //@REVIEW why does the request fail if we send a node attribute?
      return connection.getDiscoInfo(jid);
   }

   private processDiscoInfo(stanza:Element, ver:string) {
      let queryElement = stanza.querySelector('query');
      let node = queryElement.getAttribute('node') || '';
      let version = node.split('#')[1] || ver; //fix open prosody bug
      let from = new JID(stanza.getAttribute('from'));

      //@TODO verify response is valid: https://xmpp.org/extensions/xep-0115.html#ver-proc

      let capabilities = {};

      for(let childNode of Array.from(queryElement.childNodes)) {
         let nodeName = childNode.nodeName;

         if (typeof capabilities[nodeName] === 'undefined') {
            capabilities[nodeName] = [];
         }

         if (nodeName === 'feature') {
            capabilities[nodeName].push(childNode.getAttribute('var'));
         } else if(nodeName === 'identity') {
            capabilities[nodeName].push({
               category: childNode.getAttribute('category') || '',
               type: childNode.getAttribute('type') || '',
               name: childNode.getAttribute('name') || '',
               lang: childNode.getAttribute('xml:lang') || ''
            });
            //@TODO test required arguments
         }
         //@TODO handle extended information
      }

      if (typeof capabilities['identity'] === 'undefined' || capabilities['identity'].length === 0) {
         Log.info('Disco info response is unvalid. Missing identity.');
         return;
      }

      if (typeof capabilities['feature'] === 'undefined' || capabilities['feature'].indexOf('http://jabber.org/protocol/disco#info') < 0) {
         Log.info('Disco info response is unvalid. Doesnt support disco.');
         return;
      }

      let discoInfo = new DiscoInfo(capabilities['identity'], capabilities['feature']);

      if (version !== discoInfo.getCapsVersion()) {
         Log.warn('Caps version doesnt match.');
      }

      this.account.getDiscoInfoRepository().addRelation(from, discoInfo);
   }
}
