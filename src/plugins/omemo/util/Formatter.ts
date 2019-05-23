
export default {
   toReadableKey: (key: ArrayBuffer) => {
      return (<any> window).dcodeIO.ByteBuffer.wrap(key).toHex(1).toUpperCase().match(/.{1,8}/g).join(' ');
   }
}
