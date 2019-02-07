import * as CONST from '../CONST'
import { AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Message from '../Message'
import { Status } from '../vendor/Strophe'
import * as Namespace from '../connection/xmpp/namespace'
import Translation from '../util/Translation'
import { $iq } from '../vendor/Strophe'

/**
 * XEP-0280: Message Carbons
 *
 * @version 0.12.0
 * @see https://xmpp.org/extensions/xep-0280.html
 */

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class CarbonsPlugin extends AbstractPlugin {
   public static getName(): string {
      return 'Carbon Copy';
   }

   public static getDescription(): string {
      return Translation.t('setting-explanation-carbon');
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

   private preSendMessageStanzaProcessor = (message: Message, xmlElement: Strophe.Builder) => {
      let body = (<any> xmlElement).node.textContent;

      if (body.match(/^\?OTR/)) {
         xmlElement.up().c('private', {
            xmlns: CONST.NS.CARBONS
         });
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

   private disable(cb) {
      let iq = $iq({
         type: 'set'
      }).c('disable', {
         xmlns: Namespace.get('CARBONS')
      });

      return this.pluginAPI.sendIQ(iq).then(() => {
         this.pluginAPI.Log.debug('Carbons disabled');
      }).catch((stanza) => {
         this.pluginAPI.Log.warn('Could not disable carbons');
      });
   }
}
