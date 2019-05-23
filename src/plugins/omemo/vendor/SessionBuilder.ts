import { SignalSessionBuilder, ISignalBundleObject, SignalAddress } from './Signal';
import Address from './Address';
import Store from '../lib/Store';
import Bundle from '../lib/Bundle';

export class SessionBuilder {
   private signalSessionBuilder;

   constructor(address: Address, store: Store) {
      let signalAddress = new SignalAddress(address.getName(), address.getDeviceId());
      this.signalSessionBuilder = new SignalSessionBuilder(store.getSignalStore(), signalAddress);
   }

   public processPreKey(bundle: Bundle): Promise<[void, boolean]> {
      let preKey = bundle.getRandomPreKey();
      let signedPreKey = bundle.getSignedPreKey();

      let signalBundle: ISignalBundleObject = {
         identityKey: bundle.getIdentityKey().getPublic(),
         registrationId: 0,
         preKey: {
            keyId: preKey.getId(),
            publicKey: preKey.getPublic(),
         },
         signedPreKey: {
            keyId: signedPreKey.getId(),
            publicKey: signedPreKey.getPublic(),
            signature: signedPreKey.getSignature(),
         }
      };

      return this.signalSessionBuilder.processPreKey(signalBundle);
   }
}
