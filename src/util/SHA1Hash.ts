import * as sha1 from 'js-sha1'

export default function calculateHashFromBase64(data): string {
  let base64 = data.replace(/^.+;base64,/, '');
  let buffer = base64ToArrayBuffer(base64);

  return sha1(buffer);
}

function base64ToArrayBuffer(base64String) {
  let binaryString = window.atob(base64String);
  let bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}