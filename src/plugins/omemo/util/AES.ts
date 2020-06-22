import ArrayBufferUtils from '../util/ArrayBuffer'
import { AES_TAG_LENGTH, AES_KEY_LENGTH, AES_EXTRACTABLE } from '../util/Const'

const ALGO_NAME = 'AES-GCM'

export async function decrypt(exportedAESKey: ArrayBuffer, iv: Uint8Array, data: ArrayBuffer): Promise<string> {
   let key = await window.crypto.subtle.importKey('raw', exportedAESKey, ALGO_NAME, false, ['decrypt']);

   let decryptedBuffer = await window.crypto.subtle.decrypt({
      name: ALGO_NAME,
      iv,
      tagLength: AES_TAG_LENGTH
   }, key, data);

   return ArrayBufferUtils.decode(decryptedBuffer);
}

export async function encrypt(plaintext): Promise<{ keydata: ArrayBuffer, iv: BufferSource, payload: ArrayBuffer }> {
   let iv = window.crypto.getRandomValues(new Uint8Array(12));
   let key = await generateAESKey();
   let encrypted = await generateAESencryptedMessage(iv, key, plaintext);

   let ciphertext = encrypted.ciphertext;
   let authenticationTag = encrypted.authenticationTag;

   let keydata = await window.crypto.subtle.exportKey('raw', <CryptoKey> key)

   return {
      keydata: ArrayBufferUtils.concat(keydata, <ArrayBuffer> authenticationTag),
      iv,
      payload: ciphertext
   }
}

async function generateAESKey(): Promise<CryptoKey | CryptoKeyPair> {
   let algo = {
      name: ALGO_NAME,
      length: AES_KEY_LENGTH,
   };
   let keyUsage: KeyUsage[] = ['encrypt', 'decrypt'];

   let key = await window.crypto.subtle.generateKey(algo, AES_EXTRACTABLE, keyUsage);

   return key;
}

async function generateAESencryptedMessage(iv, key, plaintext): Promise<{ ciphertext: ArrayBuffer, authenticationTag: ArrayBuffer }> {
   let encryptOptions = {
      name: ALGO_NAME,
      iv,
      tagLength: AES_TAG_LENGTH
   };
   let encodedPlaintext = ArrayBufferUtils.encode(plaintext);

   let encrypted = await window.crypto.subtle.encrypt(encryptOptions, key, encodedPlaintext);
   let ciphertextLength = encrypted.byteLength - ((128 + 7) >> 3);
   let ciphertext = encrypted.slice(0, ciphertextLength)
   let authenticationTag = encrypted.slice(ciphertextLength);

   return {
      ciphertext,
      authenticationTag
   };
}
