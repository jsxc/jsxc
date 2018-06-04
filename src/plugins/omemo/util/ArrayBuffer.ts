import bufferConcat = require('array-buffer-concat');
import Base64ArrayBuffer = require('base64-arraybuffer')

let decoder = new (<any>window).TextDecoder('utf-8');
var encoder = new (<any>window).TextEncoder('utf-8');

let ArrayBufferUtils = {
   concat: (a: ArrayBuffer, b: ArrayBuffer) => bufferConcat(a, b),

   decode: (a: ArrayBuffer): string => decoder.decode(a),

   encode: (s: string): ArrayBuffer => encoder.encode(s), //@REVIEW returns Uint8Array

   toBase64: (a: ArrayBuffer): string => Base64ArrayBuffer.encode(a),

   fromBase64: (s: string): ArrayBuffer => Base64ArrayBuffer.decode(s),

   toString: (thing: ArrayBuffer | string): string => {
      if (typeof thing === 'string') {
         return thing;
      }
      return new (<any>window).dcodeIO.ByteBuffer.wrap(thing).toString('binary');
   },

   isEqual: function(a: ArrayBuffer | string, b: ArrayBuffer | string) {
      // TODO: Special-case arraybuffers, etc
      if (a === undefined || b === undefined) {
         return false;
      }

      a = ArrayBufferUtils.toString(a);
      b = ArrayBufferUtils.toString(b);

      let maxLength = Math.max(a.length, b.length);
      if (maxLength < 5) {
         throw new Error("a/b compare too short");
      }

      return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
   },

   toArray: (a: ArrayBuffer): Array<any> => Array.apply([], new Uint8Array(a)),

   fromArray: (a: Array<any>): ArrayBuffer => new Uint8Array(a).buffer,
}

export default ArrayBufferUtils;
