import Random from '../../../util/Random'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { NS_BASE } from '../util/Const'
import { $build } from '../../../vendor/Strophe'
import IdentityKey from '../model/IdentityKey';
import SignedPreKey from '../model/SignedPreKey';
import PreKey from '../model/PreKey';

export interface IBundleObject {
   identityKey: IdentityKey,
   signedPreKey: SignedPreKey,
   preKeys: PreKey[],
}

export default class Bundle {
   constructor(private bundle: IBundleObject) {

   }

   public getIdentityKey(): IdentityKey {
      return this.bundle.identityKey;
   }

   public getSignedPreKey(): SignedPreKey {
      return this.bundle.signedPreKey;
   }

   public getRandomPreKey(): PreKey {
      let numberOfPreKeys = this.bundle.preKeys.length;
      let candidateNumber = Random.number(numberOfPreKeys - 1);

      return this.bundle.preKeys[candidateNumber];
   }

   public toXML(): Strophe.Builder {
      let xmlBundle = $build('bundle', {
         xmlns: NS_BASE
      });

      xmlBundle
         .c('signedPreKeyPublic', {
            signedPreKeyId: this.bundle.signedPreKey.getId()
         })
         .t(ArrayBufferUtils.toBase64(this.bundle.signedPreKey.getPublic()))
         .up();

      xmlBundle
         .c('signedPreKeySignature')
         .t(ArrayBufferUtils.toBase64(this.bundle.signedPreKey.getSignature()))
         .up();

      xmlBundle
         .c('identityKey')
         .t(ArrayBufferUtils.toBase64(this.bundle.identityKey.getPublic()))
         .up();

      xmlBundle
         .c('prekeys');

      for (let preKey of this.bundle.preKeys) {
         xmlBundle
            .c('preKeyPublic', {
               preKeyId: preKey.getId()
            })
            .t(ArrayBufferUtils.toBase64(preKey.getPublic()))
            .up();
      }

      xmlBundle.up();

      return xmlBundle;
   }

   public static fromXML(xmlElement): Bundle {
      let targetSelector = `bundle[xmlns="${NS_BASE}"]`;
      let xmlBundle = $(xmlElement).is(targetSelector) ? $(xmlElement) : $(xmlElement).find(targetSelector);

      if (xmlBundle.length !== 1) {
         throw new Error('Could not find bundle element');
      }

      let xmlIdentityKey = xmlBundle.find('identityKey');
      let xmlSignedPreKeyPublic = xmlBundle.find('signedPreKeyPublic');
      let xmlSignedPreKeySignature = xmlBundle.find('signedPreKeySignature');
      let xmlPreKeys = xmlBundle.find('preKeyPublic');

      let identityKey = new IdentityKey({
         publicKey: ArrayBufferUtils.fromBase64(xmlIdentityKey.text()),
      });

      let signedPreKey = new SignedPreKey({
         keyPair: {
            publicKey: ArrayBufferUtils.fromBase64(xmlSignedPreKeyPublic.text())
         },
         signature: ArrayBufferUtils.fromBase64(xmlSignedPreKeySignature.text()),
         keyId: parseInt(xmlSignedPreKeyPublic.attr('signedPreKeyId'), 10)
      });

      let preKeys = xmlPreKeys.get().map(function(element) {
         return new PreKey({
            keyPair: {
               publicKey: ArrayBufferUtils.fromBase64($(element).text())
            },
            keyId: parseInt($(element).attr('preKeyId'), 10)
         });
      });

      return new Bundle({
         identityKey,
         signedPreKey,
         preKeys,
      });
   }
}
