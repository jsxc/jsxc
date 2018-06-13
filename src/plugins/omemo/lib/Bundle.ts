import { KeyPairObject, SignedPreKeyObject, PreKeyObject, BundleObject, SignalBundleObject } from './ObjectTypes'
import Random from '../../../util/Random'
import ArrayBufferUtils from '../util/ArrayBuffer'
import { $build } from '../../../vendor/Strophe'

export default class Bundle {
   constructor(private bundle: BundleObject) {

   }

   public getIdentityKey(): KeyPairObject {
      return this.bundle.identityKey;
   }

   public getSignedPreKey(): SignedPreKeyObject {
      return this.bundle.signedPreKey;
   }

   public getRandomPreKey(): PreKeyObject {
      let numberOfPreKeys = this.bundle.preKeys.length;
      let candidateNumber = Random.number(numberOfPreKeys - 1);

      return this.bundle.preKeys[candidateNumber];
   }

   public toSignalBundle(registrationId: number): SignalBundleObject {
      let preKey = this.getRandomPreKey();
      let signedPreKey = this.getSignedPreKey();

      return {
         identityKey: this.getIdentityKey().pubKey,
         registrationId: registrationId,
         preKey: {
            keyId: preKey.keyId,
            publicKey: preKey.keyPair.pubKey
         },
         signedPreKey: {
            keyId: signedPreKey.keyId,
            publicKey: signedPreKey.keyPair.pubKey,
            signature: signedPreKey.signature
         }
      };
   }

   public toXML() {
      let xmlBundle = $build('bundle', {
         xmlns: 'eu.siacs.conversations.axolotl'
      });

      xmlBundle
         .c('signedPreKeyPublic', {
            signedPreKeyId: this.bundle.signedPreKey.keyId
         })
         .t(ArrayBufferUtils.toBase64(this.bundle.signedPreKey.keyPair.pubKey))
         .up();

      xmlBundle
         .c('signedPreKeySignature')
         .t(ArrayBufferUtils.toBase64(<ArrayBuffer>this.bundle.signedPreKey.signature)) //@REVIEW
         .up();

      xmlBundle
         .c('identityKey')
         .t(ArrayBufferUtils.toBase64(this.bundle.identityKey.pubKey))
         .up();

      for (let preKey of this.bundle.preKeys) {
         xmlBundle
            .c('preKeyPublic', {
               preKeyId: preKey.keyId
            })
            .t(ArrayBufferUtils.toBase64(preKey.keyPair.pubKey))
            .up();
      }

      return xmlBundle;
   }

   public static fromXML(xmlElement): Bundle {
      let targetSelector = 'bundle[xmlns="eu.siacs.conversations.axolotl"]';
      let xmlBundle = $(xmlElement).is(targetSelector) ? $(xmlElement) : $(xmlElement).find(targetSelector);

      if (xmlBundle.length !== 1) {
         throw new Error('Could not find bundle element');
      }

      let xmlIdentityKey = xmlBundle.find('identityKey');
      let xmlSignedPreKeyPublic = xmlBundle.find('signedPreKeyPublic');
      let xmlSignedPreKeySignature = xmlBundle.find('signedPreKeySignature');
      let xmlPreKeys = xmlBundle.find('preKeyPublic');

      return new Bundle({
         identityKey: {
            pubKey: ArrayBufferUtils.fromBase64(xmlIdentityKey.text())
         },
         signedPreKey: {
            keyPair: {
               pubKey: ArrayBufferUtils.fromBase64(xmlSignedPreKeyPublic.text())
            },
            signature: ArrayBufferUtils.fromBase64(xmlSignedPreKeySignature.text()),
            keyId: parseInt(xmlSignedPreKeyPublic.attr('signedPreKeyId'))
         },
         preKeys: <PreKeyObject[]>xmlPreKeys.get().map(function(element) {
            return {
               keyPair: {
                  pubKey: ArrayBufferUtils.fromBase64($(element).text())
               },
               keyId: parseInt($(element).attr('preKeyId'))
            }
         }),
      });
   }
}
