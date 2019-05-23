import PreKey from '../model/PreKey';
import SignedPreKey from '../model/SignedPreKey';
import IdentityKey from '../model/IdentityKey';
import { SignalKeyHelper } from './Signal';

export class KeyHelper {
   public static async generatePreKey(keyId: number): Promise<PreKey> {
      let signalPreKey = await SignalKeyHelper.generatePreKey(keyId);

      return new PreKey({
         keyId: signalPreKey.keyId,
         keyPair: {
            publicKey: signalPreKey.keyPair.pubKey,
            privateKey: signalPreKey.keyPair.privKey,
         },
      });
   }

   public static async generateSignedPreKey(identityKey: IdentityKey, signedKeyId: number): Promise<SignedPreKey> {
      let signalIdentityKey = {
         pubKey: identityKey.getPublic(),
         privKey: identityKey.getPrivate(),
      };

      let signalSignedPreKey = await SignalKeyHelper.generateSignedPreKey(signalIdentityKey, signedKeyId);

      return new SignedPreKey({
         keyId: signalSignedPreKey.keyId,
         keyPair: {
            publicKey: signalSignedPreKey.keyPair.pubKey,
            privateKey: signalSignedPreKey.keyPair.privKey,
         },
         signature: signalSignedPreKey.signature,
      });
   }

   public static async generateIdentityKey(): Promise<IdentityKey> {
      let signalIdentityKey = await SignalKeyHelper.generateIdentityKeyPair();

      return new IdentityKey({
         publicKey: signalIdentityKey.pubKey,
         privateKey: signalIdentityKey.privKey,
      });
   }

   public static generateRegistrationId(): number {
      return SignalKeyHelper.generateRegistrationId();
   }
}
