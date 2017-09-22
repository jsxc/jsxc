import Account from './Account'
import DiscoInfo from './DiscoInfo'
import PersistentMap from './util/PersistentMap'
import JID from './JID'
import Contact from './Contact'
import Log from './util/Log'

export default class DiscoInfoRepository {
  private jidIndex:PersistentMap;

  constructor(private account:Account) {
    this.jidIndex = new PersistentMap(account.getStorage(), 'capabilities');
  }

  public addRelation(jid:JID, discoInfo:DiscoInfo) {
    if (jid.isBare()) {
      Log.warn('We can only add relations for full jids.')
    } else {
      this.jidIndex.set(jid.full, discoInfo.getCapsVersion());
    }
  }

  public getDiscoInfo(jid:JID) {
    let version = this.jidIndex.get(jid.full);

    return new DiscoInfo(version);
  }

  public getCapableResources(contact:Contact, features:string[]):Promise<Array<string>>
  public getCapableResources(contact:Contact, features:string):Promise<Array<string>>
  public getCapableResources(contact:Contact, features):Promise<Array<string>> {
     let resources = contact.getResources();

     if (!features) {
        return Promise.resolve(resources);
     }

     let capableResources = [];
     let promises = [];

     for(let resource of resources) {
       //@REVIEW
       promises.push(new Promise(resolve => {
         let jid = new JID(contact.getJid().bare + '/' + resource);

         this.hasFeature(jid, features)
           .then((hasSupport) => {
             resolve(hasSupport? resource : undefined);
           });
         //@REVIEW do we need a timer?
       }));
     }

     return Promise.all(promises).then((capableResources) => {
       return capableResources.filter(resource => typeof resource === 'string');
     });
  }

  public hasFeature(jid:JID, features:string[]):Promise<{}>
  public hasFeature(jid:JID, feature:string):Promise<{}>
  public hasFeature() {
    let jid:JID = arguments[0];
    let features = (arguments[1] instanceof Array) ? arguments[1] : [arguments[1]];

    if (jid.isBare()) {
      return Promise.reject('We need a full jid.');
    }

    return this.getCapabilities(jid).then((capabilities:DiscoInfo) => {
      let availableFeatures = capabilities.getFeatures();

      for (let feature of features) {
        if (availableFeatures.indexOf(feature) < 0) {
          return false;
        }
      }

      return true;
    })
  }

  public getCapabilities(jid:JID):Promise<DiscoInfo|void> {
     let jidIndex = this.jidIndex;

     if (jid.isBare()) {
       return Promise.reject('We need a full jid.');
     }

     return new Promise<DiscoInfo>((resolve) => {
       checkCaps(resolve);
     });

     function checkCaps(cb) {
       let version = jidIndex.get(jid.full);

       if (version) {
         cb(new DiscoInfo(version));
       } else {
         setTimeout(() => {
           checkCaps(cb);
         }, 200);
       }
     }
  }
}
