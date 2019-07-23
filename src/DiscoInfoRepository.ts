import Account from './Account'
import DiscoInfo from './DiscoInfo'
import PersistentMap from './util/PersistentMap'
import JID from './JID'
import Contact from './Contact'
import Log from '@util/Log';
import Client from './Client'
import Form from './connection/Form'
import { IDiscoInfoRepository } from './DiscoInfoRepository.interface'
import { IJID } from './JID.interface';

export default class implements IDiscoInfoRepository {
   private jidVersionMap: PersistentMap;

   constructor(private account: Account) {
      this.jidVersionMap = new PersistentMap(Client.getStorage(), 'capabilities');
   }

   public addRelation(jid: IJID, version: string): void
   public addRelation(jid: IJID, discoInfo: DiscoInfo): void
   public addRelation(jid: IJID, value: string | DiscoInfo) {
      if (value instanceof DiscoInfo) {
         this.jidVersionMap.set(jid.full, value.getCapsVersion());
      } else if (typeof value === 'string') {
         this.jidVersionMap.set(jid.full, value);
      }
   }

   public getDiscoInfo(jid: IJID) {
      let version = this.jidVersionMap.get(jid.full);

      if (!version) {
         throw new Error('Found no disco version');
      }

      return new DiscoInfo(version);
   }

   public getCapableResources(contact: Contact, features: string[]): Promise<string[]>
   public getCapableResources(contact: Contact, features: string): Promise<string[]>
   public getCapableResources(contact: Contact, features): Promise<string[]> {
      let resources = contact.getResources();

      if (!features) {
         return Promise.resolve(resources);
      }

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

   public hasFeature(jid: IJID, features: string[]): Promise<boolean>
   public hasFeature(jid: IJID, feature: string): Promise<boolean>
   public hasFeature(discoInfo: DiscoInfo, features: string[]): Promise<boolean>
   public hasFeature(discoInfo: DiscoInfo, feature: string): Promise<boolean>
   public hasFeature() {
      let features = (arguments[1] instanceof Array) ? arguments[1] : [arguments[1]];
      let capabilitiesPromise;

      if (arguments[0] instanceof JID) {
         let jid: JID = arguments[0];

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

   public getCapabilities(jid: IJID): Promise<DiscoInfo | void> {
      let jidVersionMap = this.jidVersionMap;
      let version = jidVersionMap.get(jid.full);

      if (!version || !DiscoInfo.exists(version)) {
         return this.requestDiscoInfo(jid).then(discoInfo => {
            if (version && version !== discoInfo.getCapsVersion()) {
               Log.warn(`Caps version doesn't match for ${jid.full}. Expected: ${version}. Actual: ${discoInfo.getCapsVersion()}.`);
            } else if (!version) {
               this.addRelation(jid, discoInfo);
            }

            return discoInfo;
         });
      }

      return new Promise<DiscoInfo>((resolve) => {
         checkCaps(resolve);
      });

      function checkCaps(cb) {
         let version = jidVersionMap.get(jid.full);

         if (version && DiscoInfo.exists(version)) {
            cb(new DiscoInfo(version));
         } else {
            setTimeout(() => {
               checkCaps(cb);
            }, 200);
         }
      }
   }

   public requestDiscoInfo(jid: IJID, node?: string) {
      let connection = this.account.getConnection();

      //@REVIEW why does the request fail if we send a node attribute?
      return connection.getDiscoService().getDiscoInfo(jid).then(this.processDiscoInfo);
   }

   private processDiscoInfo(stanza: Element) {
      let queryElement = $(stanza).find('query');
      // let node = queryElement.attr('node') || '';
      // let from = new JID($(stanza).attr('from'));

      //@TODO verify response is valid: https://xmpp.org/extensions/xep-0115.html#ver-proc

      let capabilities: { [name: string]: any } = {};

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

      if (typeof capabilities.identity === 'undefined' || capabilities.identity.length === 0) {
         return Promise.reject('Disco info response is invalid. Missing identity.');
      }

      let forms = queryElement.find('x[xmlns="jabber:x:data"]').get().map((element) => {
         return Form.fromXML(element);
      });

      //   if (typeof capabilities['feature'] === 'undefined' || capabilities['feature'].indexOf('http://jabber.org/protocol/disco#info') < 0) {
      //      return Promise.reject('Disco info response is unvalid. Doesnt support disco.');
      //   }

      let discoInfo = new DiscoInfo(capabilities.identity, capabilities.feature, forms);

      return Promise.resolve(discoInfo);
   }
}
