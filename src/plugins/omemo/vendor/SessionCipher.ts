import { SignalSessionCipher, SignalAddress } from './Signal';
import Address from './Address';
import Store from '../lib/Store';
import { ICiphertext } from '../model/EncryptedDeviceMessage';

export class SessionCipher {
   private signalSessionCipher;

   constructor(address: Address, store: Store) {
      let signalAddress = new SignalAddress(address.getName(), address.getDeviceId());

      this.signalSessionCipher = new SignalSessionCipher(store.getSignalStore(), signalAddress);
   }

   public decryptPreKeyMessage(ciphertext): Promise<ArrayBuffer> {
      return this.signalSessionCipher.decryptPreKeyWhisperMessage(ciphertext, 'binary');
   }

   public decryptMessage(ciphertext): Promise<ArrayBuffer> {
      return this.signalSessionCipher.decryptWhisperMessage(ciphertext, 'binary');
   }

   public encryptMessage(plaintext): Promise<ICiphertext> {
      return this.signalSessionCipher.encrypt(plaintext, 'binary');
   }
}
