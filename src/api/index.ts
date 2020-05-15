import { testBOSHServer } from './v1/testBOSHServer';
import Client from '../Client';
import * as v1 from './v1'
import { AbstractPlugin } from '@src/plugin/AbstractPlugin';
import { EncryptionPlugin } from '@src/plugin/EncryptionPlugin';

export default class JSXC {
   public static readonly version = __VERSION__;

   public static readonly testBOSHServer = testBOSHServer;

   public static readonly register = v1.register;

   public static readonly AbstractPlugin = AbstractPlugin;

   public static readonly AbstractEncryptionPlugin = EncryptionPlugin;

   public static readonly jQuery = $;

   private static initialized = false;

   public numberOfCachedAccounts: number;

   public version: string = __VERSION__;

   constructor(options) {
      if (JSXC.initialized) {
         throw new Error('JSXC was already initialized');
      }

      JSXC.initialized = true;

      this.numberOfCachedAccounts = Client.init(options);

      Object.assign(this, v1);
   }
}
