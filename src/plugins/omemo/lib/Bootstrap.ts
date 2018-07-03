import Store from './Store'
import { KeyHelper } from '../vendor/Signal'
import Random from '../../../util/Random'
import Log from '../../../util/Log'
import { IConnection } from '../../../connection/Connection.interface'
import Bundle from './Bundle'
import { NS_BASE, NS_DEVICELIST, NS_BUNDLES, NUM_PRE_KEYS } from '../util/Const'
import { SignedPreKeyObject, KeyPairObject, PreKeyObject } from './ObjectTypes'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { $build } from '../../../vendor/Strophe'

export default class Bootstrap {
   constructor(private store: Store, private connection: IConnection) {

   }

   public async prepare() {
      if (!this.store.isReady()) {
         await this.setup();
      }

      if (!this.store.isPublished()) {
         let bundle = await this.generateBundle();
         let node = NS_BUNDLES + this.store.getDeviceId();

         await this.connection.getPEPService().publish(node, bundle.toXML().tree());
         this.store.put('published', true);

         await this.addDeviceIdToDeviceList();
      }

      Log.debug('OMEMO prepared');
   }

   public addDeviceIdToDeviceList(): Promise<Element> {
      let jid = this.connection.getJID();
      let deviceIds = this.store.getDeviceList(jid.bare); //@REVIEW jid.bare
      let ownDeviceId = this.store.getDeviceId();

      if (deviceIds.indexOf(ownDeviceId) < 0) {
         deviceIds.push(ownDeviceId);
      }

      let xmlList = $build('list', { xmlns: NS_BASE });

      for (let id of deviceIds) {
         xmlList.c('device', { id: id }).up();
      }

      return this.connection.getPEPService().publish(NS_DEVICELIST, xmlList.tree());
   }

   private setup() {
      return Promise.all([
         this.generateDeviceId(),
         KeyHelper.generateIdentityKeyPair(),
         KeyHelper.generateRegistrationId(),
      ]).then(([deviceId, identityKey, registrationId]) => {
         //@TODO add store setter or initOwnDevice function
         this.store.put('deviceId', deviceId);
         this.store.put('deviceName', this.connection.getJID().bare);
         this.store.put('identityKey', identityKey);
         this.store.put('registrationId', registrationId);
      });
   }

   private generateDeviceId(): Promise<number> {
      return Promise.resolve(Random.number(Math.pow(2, 31) - 1, 1));
   }

   public async generateBundle(): Promise<Bundle> {
      Log.debug('Generate OMEMO bundle');

      let preKeyPromises = [];

      for (let i = 0; i < NUM_PRE_KEYS; i++) {
         preKeyPromises.push(this.generatePreKey(i));
      }

      preKeyPromises.push(this.generateSignedPreKey(1)); //@REVIEW signed prekey id

      let preKeys = await Promise.all(preKeyPromises);
      let identityKey = await this.store.getIdentityKeyPair();

      return new Bundle({
         identityKey: identityKey,
         signedPreKey: preKeys.pop(),
         preKeys: <PreKeyObject[]>preKeys
      });
   }

   private async generatePreKey(id): Promise<PreKeyObject> {
      let preKey = await KeyHelper.generatePreKey(id);

      this.store.storePreKey(id, preKey.keyPair);

      return preKey;
   }

   private async generateSignedPreKey(id): Promise<SignedPreKeyObject> {
      let identity = await this.store.getIdentityKeyPair();
      let signedPreKey = await KeyHelper.generateSignedPreKey(identity, id);

      this.store.storeSignedPreKey(id, signedPreKey.keyPair);

      return signedPreKey;
   }
}
