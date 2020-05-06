import Client from '../Client'
import Account from '../Account'
import Log from '../util/Log'
import { AbstractPlugin, IPlugin } from './AbstractPlugin'
import { EncryptionPlugin } from './EncryptionPlugin'
import PluginAPI from './PluginAPI'

export default class PluginRepository {
   private static registeredPluginIds: string[] = [];
   private static registeredPlugins: IPlugin[] = [];

   private plugins: AbstractPlugin[] = [];

   private encryptionPlugins: EncryptionPlugin[] = [];

   public static add(Plugin: IPlugin) {
      if (typeof Plugin.getId !== 'function' || typeof Plugin.getId() !== 'string') {
         throw new Error('This plugin doesn\'t implement static getId():string');
      }

      if (typeof Plugin.getName !== 'function' || typeof Plugin.getName() !== 'string') {
         throw new Error('This plugin doesn\'t implement static getName():string');
      }

      let id = Plugin.getId();

      if (!/^[a-z0-9_\-]+$/.test(id)) {
         throw new Error(`This plugin has an invalid id (${id}). Only [a-z0-9_-] is allowed.`);
      }

      if (PluginRepository.registeredPluginIds.indexOf(id) > -1) {
         throw new Error(`There is already a plugin with the id ${id}.`)
      }

      PluginRepository.registeredPluginIds.push(id);
      PluginRepository.registeredPlugins.push(Plugin);
   }

   constructor(private account: Account) {
      let accountDisabledPlugins = account.getOption('disabledPlugins');

      this.getAllEnabledRegisteredPlugins().forEach((Plugin) => {
         if (accountDisabledPlugins.indexOf(Plugin.getId()) > -1) {
            Log.debug(`${Plugin.getId()} was disabled by the user.`);

            return;
         }

         try {
            this.instantiatePlugin(Plugin);
         } catch (err) {
            Log.warn(err);
         }
      });
   }

   public getAllRegisteredPlugins() {
      return PluginRepository.registeredPlugins;
   }

   public getAllEnabledRegisteredPlugins() {
      let disabledPlugins = Client.getOption('disabledPlugins') || [];

      return this.getAllRegisteredPlugins().filter(Plugin => disabledPlugins.indexOf(Plugin.getId()) < 0);
   }

   public getAllEncryptionPlugins() {
      return this.encryptionPlugins;
   }

   public getEncryptionPlugin(pluginId: string): EncryptionPlugin {
      for (let plugin of this.encryptionPlugins) {
         if ((<IPlugin> plugin.constructor).getId() === pluginId) {
            return plugin;
         }
      }

      throw new Error(`Couldn't find ${pluginId}`);
   }

   public hasEncryptionPlugin(): boolean {
      return !!this.encryptionPlugins;
   }

   public destroyAllPlugins() {
      this.plugins.forEach(plugin => plugin.destroy());

      this.encryptionPlugins.forEach(plugin => plugin.destroy());
   }

   private instantiatePlugin(Plugin: IPlugin) {
      let plugin;

      Log.debug('Instanciate ' + Plugin.getId() + ' for account ' + this.account.getUid())

      plugin = new Plugin(new PluginAPI(Plugin.getId(), this.account));

      if (!(plugin instanceof AbstractPlugin)) {
         throw new Error(Plugin.getId() + ' doesn\'t extend AbstractPlugin');
      }

      if (plugin instanceof EncryptionPlugin) {
         this.encryptionPlugins.push(plugin);
      } else {
         this.plugins.push(plugin);
      }
   }
}
