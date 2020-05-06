import * as CONST from '../CONST'
import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Message from '../Message'
import { Status } from '../vendor/Strophe'
import * as Namespace from '../connection/xmpp/namespace'
import Translation from '../util/Translation'
import { $iq } from '../vendor/Strophe'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class CarbonsPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'carbon';
   }

   public static getName(): string {
      return 'Carbon Copy';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-explanation-carbon'),
         xeps: [{
            id: 'XEP-0280',
            name: 'Message Carbons',
            version: '0.12.0',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('CARBONS', 'urn:xmpp:carbons:2');

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      pluginAPI.registerConnectionHook((status, condition) => {
         if (status === Status.ATTACHED) {
            this.init();
         }
      });
   }

   private preSendMessageStanzaProcessor = (message: Message, xmlElement: Strophe.Builder): Promise<[Message, Strophe.Builder]> => {
      let body = (<any> xmlElement).node.textContent;

      if (body.match(/^\?OTR/)) {
         xmlElement.c('private', {
            xmlns: CONST.NS.CARBONS
         }).up();
      }

      return Promise.resolve([message, xmlElement]);
   }

   private init() {
      let sessionStorage = this.pluginAPI.getSessionStorage();
      let inited = sessionStorage.getItem('carbons', 'inited') || false;

      if (!inited) {
         this.enable().then(() => {
            sessionStorage.setItem('carbons', 'inited', true);
         });
      }
   }

   private enable() {
      let iq = $iq({
         type: 'set'
      }).c('enable', {
         xmlns: Namespace.get('CARBONS')
      });

      return this.pluginAPI.sendIQ(iq).then(() => {
         this.pluginAPI.Log.debug('Carbons enabled');
      }).catch((stanza) => {
         this.pluginAPI.Log.warn('Could not enable carbons');
      });
   }

   // private disable(cb) {
   //    let iq = $iq({
   //       type: 'set'
   //    }).c('disable', {
   //       xmlns: Namespace.get('CARBONS')
   //    });

   //    return this.pluginAPI.sendIQ(iq).then(() => {
   //       this.pluginAPI.Log.debug('Carbons disabled');
   //    }).catch((stanza) => {
   //       this.pluginAPI.Log.warn('Could not disable carbons');
   //    });
   // }
}
