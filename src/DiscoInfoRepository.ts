import Account from './Account'
import DiscoInfo from './DiscoInfo'
import PersistentMap from './util/PersistentMap'
import JID from './JID'
import Contact from './Contact'
import Log from './util/Log'
import Client from './Client'
import Form from './connection/Form'
import { DiscoInfoRepository } from './DiscoInfoRepository.interface'

export default class implements DiscoInfoRepository {
   private jidIndex: PersistentMap;
   private serverJidIndex: PersistentMap;

   constructor(private account: Account) {
      this.jidIndex = new PersistentMap(account.getStorage(), 'capabilities');
      this.serverJidIndex = new PersistentMap(Client.getStorage(), 'capabilities');
   }

   public addRelation(jid: JID, version: string)
   public addRelation(jid: JID, discoInfo: DiscoInfo)
   public addRelation(jid, value) {
      let index = jid.isServer() ? this.serverJidIndex : this.jidIndex;

      if (jid.isBare() && !jid.isServer) {
         Log.warn('We can only add relations for full jids.')
      } else if (value instanceof DiscoInfo) {
         index.set(jid.full, value.getCapsVersion());
      } else if (typeof value === 'string') {
         index.set(jid.full, value);
      }
   }

   public getDiscoInfo(jid: JID) {
      let version = this.jidIndex.get(jid.full);

      return new DiscoInfo(version);
   }

   public getCapableResources(contact: Contact, features: string[]): Promise<Array<string>>
   public getCapableResources(contact: Contact, features: string): Promise<Array<string>>
   public getCapableResources(contact: Contact, features): Promise<Array<string>> {
      let resources = contact.getResources();

      if (!features) {
         return Promise.resolve(resources);
      }

      let capableResources = [];
      let promises = [];

      for (let resource of resources) {
         //@REVIEW
         promises.push(new Promise(resolve => {
            let jid = new JID(contact.getJid().bare + '/' + resource);

            this.hasFeature(jid, features)
               .then((hasSupport) => {
                  resolve(hasSupport ? resource : undefined);
               });
            //@REVIEW do we need a timer?
         }));
      }

      return Promise.all(promises).then((capableResources) => {
         return capableResources.filter(resource => typeof resource === 'string');
      });
   }

   public hasFeature(jid: JID, features: string[]): Promise<{}>
   public hasFeature(jid: JID, feature: string): Promise<{}>
   public hasFeature(discoInfo: DiscoInfo, features: string[]): Promise<{}>
   public hasFeature(discoInfo: DiscoInfo, feature: string): Promise<{}>
   public hasFeature() {
      let features = (arguments[1] instanceof Array) ? arguments[1] : [arguments[1]];
      let capabilitiesPromise;

      if (arguments[0] instanceof JID) {
         let jid: JID = arguments[0];

         if (jid.isBare() && !jid.isServer()) {
            return Promise.reject('We need a full jid.');
         }

         capabilitiesPromise = this.getCapabilities(jid)
      } else if (arguments[0] instanceof DiscoInfo) {
         capabilitiesPromise = Promise.resolve(arguments[0])
      } else {
         return Promise.reject('Wrong parameters');
      }

      return capabilitiesPromise.then((capabilities: DiscoInfo) => {
         return capabilities.hasFeature(features);
      })
   }

   public getCapabilities(jid: JID): Promise<DiscoInfo | void> {
      let jidIndex = this.jidIndex;
      let serverJidIndex = this.serverJidIndex;

      if (jid.isBare() && !jid.isServer()) {
         //  return Promise.reject('We need a full jid.');
      }

      if (jid.isServer()) {
         let version = serverJidIndex.get(jid.domain);

         if (!version || (version && !DiscoInfo.exists(version))) {
            return this.requestDiscoInfo(jid);
            //@TODO verify version
         }
      }

      return new Promise<DiscoInfo>((resolve) => {
         checkCaps(resolve);
      });

      function checkCaps(cb) {
         let version = jid.isServer() ? serverJidIndex.get(jid.domain) : jidIndex.get(jid.full);

         if (version && DiscoInfo.exists(version)) {
            cb(new DiscoInfo(version));
         } else {
            setTimeout(() => {
               checkCaps(cb);
            }, 200);
         }
      }
   }

   public requestDiscoInfo(jid: JID, node?: string) {
      let connection = this.account.getConnection();

      //@REVIEW why does the request fail if we send a node attribute?
      return connection.getDiscoInfo(jid).then(this.processDiscoInfo);
   }

   private processDiscoInfo(stanza: Element) {
      let queryElement = $(stanza).find('query');
      let node = queryElement.attr('node') || '';
      let from = new JID($(stanza).attr('from'));

      //@TODO verify response is valid: https://xmpp.org/extensions/xep-0115.html#ver-proc

      let capabilities = {};

      for (let childNode of Array.from(queryElement.get(0).childNodes)) {
         let nodeName = childNode.nodeName.toLowerCase();

         if (typeof capabilities[nodeName] === 'undefined') {
            capabilities[nodeName] = [];
         }

         if (nodeName === 'feature') {
            capabilities[nodeName].push($(childNode).attr('var'));
         } else if (nodeName === 'identity') {
            capabilities[nodeName].push({
               category: $(childNode).attr('category') || '',
               type: $(childNode).attr('type') || '',
               name: $(childNode).attr('name') || '',
               lang: $(childNode).attr('xml:lang') || ''
            });
            //@TODO test required arguments
         }
         //@TODO handle extended information
      }

      if (typeof capabilities['identity'] === 'undefined' || capabilities['identity'].length === 0) {
         return Promise.reject('Disco info response is invalid. Missing identity.');
      }

      let forms = queryElement.find('x[xmlns="jabber:x:data"]').get().map((element) => {
         return Form.fromXML(element);
      });

      //   if (typeof capabilities['feature'] === 'undefined' || capabilities['feature'].indexOf('http://jabber.org/protocol/disco#info') < 0) {
      //      return Promise.reject('Disco info response is unvalid. Doesnt support disco.');
      //   }

      let discoInfo = new DiscoInfo(capabilities['identity'], capabilities['feature'], forms);

      return Promise.resolve(discoInfo);
   }
}
