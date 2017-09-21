import Account from '../Account'
import Client from '../Client'
import Storage from '../Storage'
import Contact from '../Contact'
import Message from '../Message'
import Pipe from '../util/Pipe'
import PluginAPI from './PluginAPI'

export enum PluginType {
   Encryption
}

export enum PluginState {
   Enabled, Ready, Disabled
}

export enum EncryptionState {
   Plaintext,
   VerifiedEncrypted,
   UnverifiedEncrypted,
   Ended
};

export interface IPlugin {
   new(pluginAPI:PluginAPI): AbstractPlugin
   getName():string
}

export abstract class AbstractPlugin {
   public static getName():string {
      return null;
   }

   constructor(protected minVersion:string, protected maxVersion:string, protected pluginAPI:PluginAPI) {
      if (!this.isSupportingClientVersion()) {
         throw 'This plugin doesn\'t support this client version';
      }
   }

   private isSupportingClientVersion():boolean {
      let clientVersionNumber = this.getVersionNumber(this.pluginAPI.getVersion());
      let minVersionNumber = this.getVersionNumber(this.minVersion);
      let maxVersionNumber = this.getVersionNumber(this.maxVersion);

      return clientVersionNumber >= minVersionNumber && clientVersionNumber <= maxVersionNumber;
   }

   private getVersionNumber(version:string):number {
      let versions = version.split('.').map(function(v){return parseInt(v);});

      return versions[0] * 1000000 + versions[1] * 1000 + versions[2];
   }
}
