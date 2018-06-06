import Base64ArrayBuffer = require('base64-arraybuffer')
import ByteBuffer = require('bytebuffer')

let decoder = new (<any>window).TextDecoder('utf-8');
let encoder = new (<any>window).TextEncoder('utf-8');

let ArrayBufferUtils = {
   concat: (a: ArrayBuffer, b: ArrayBuffer) => ByteBuffer.concat([a, b]),

   decode: (a: ArrayBuffer): string => decoder.decode(a),

   encode: (s: string): ArrayBuffer => encoder.encode(s), //@REVIEW returns Uint8Array

   toBase64: (a: ArrayBuffer): string => Base64ArrayBuffer.encode(a),

   fromBase64: (s: string): ArrayBuffer => Base64ArrayBuffer.decode(s),

   toString: (thing: ArrayBuffer | string): string => {
      if (typeof thing === 'string') {
         return thing;
      }

      return ByteBuffer.wrap(thing).toString('binary');
   },

   toHex: (thing: ArrayBuffer | string): string => {
      return ByteBuffer.wrap(thing).toString('hex');
   },

   isEqual: function(a: ArrayBuffer | string, b: ArrayBuffer | string) {
      if (a === undefined || b === undefined) {
         return false;
      }

      a = ArrayBufferUtils.toString(a);
      b = ArrayBufferUtils.toString(b);

      if (Math.min(a.length, b.length) < 5) {
         throw new Error('a/b compare too short');
      }

      return a === b;
   },

   toArray: (a: ArrayBuffer): Array<any> => Array.apply([], new Uint8Array(a)),

   fromArray: (a: Array<any>): ArrayBuffer => new Uint8Array(a).buffer,
}

export default ArrayBufferUtils;
