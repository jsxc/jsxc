import Client from '../Client'
import Account from '../Account'
import Log from '../util/Log'
import {AbstractPlugin, IPlugin} from './AbstractPlugin'
import {EncryptionPlugin} from './EncryptionPlugin'
import PluginAPI from './PluginAPI'

export default class PluginRepository {
   private static instance:PluginRepository;

   private static registeredPlugins = [];

   private plugins:Array<AbstractPlugin> = [];

   private encryptionPlugins:Array<EncryptionPlugin> = [];

   public static add(Plugin:IPlugin) {
      if (typeof Plugin.getName !== 'function' || typeof Plugin.getName() !== 'string') {
         throw 'This plugin doesn\'t implement static getName():string';
      }

      //@TODO check distinct name

      Log.debug('Add ' + Plugin.getName() + ' to plugin repository');

      PluginRepository.registeredPlugins.push(Plugin);
   }

   constructor(private account:Account) {
      PluginRepository.registeredPlugins.forEach((Plugin) => {
         try {
            this.instanciatePlugin(Plugin);
         } catch(err) {
            Log.warn(err);
         }
      });
   }

   public getAllEncryptionPlugins() {

   }

   public getEncryptionPlugin(pluginName:string):EncryptionPlugin {
      //@TODO use dict to get the right plugin

      return this.encryptionPlugins[0];
   }

   public hasEncryptionPlugin():boolean {
      return !!this.encryptionPlugins;
   }

   private instanciatePlugin(Plugin:IPlugin) {
      let plugin;

      Log.debug('Instanciate ' + Plugin.getName() + ' for account ' + this.account.getUid())

      plugin = new Plugin(new PluginAPI(Plugin.getName(), this.account));

      if (!(plugin instanceof AbstractPlugin)) {
         throw Plugin.getName() + ' doesn\'t extend AbstractPlugin';
      }

      if (plugin instanceof EncryptionPlugin) { console.log(Plugin.getName() + ' is an encryption plugin');
         this.encryptionPlugins.push(plugin);
      } else { console.log(Plugin.getName() + ' is a normal plugin');
         this.plugins.push(plugin);
      }
   }
}
