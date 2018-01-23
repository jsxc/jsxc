import Options from '../Options'
import * as CONST from '../CONST'
import { PluginState, AbstractPlugin } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Account from '../Account'
import Log from '../util/Log'
import Contact from '../Contact'
import Message from '../Message'
import * as Namespace from '../connection/xmpp/namespace'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '4.0.0';

export default class CarbonsPlugin extends AbstractPlugin {
   public static getName(): string {
      return 'carbons';
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      Namespace.register('CARBONS', 'urn:xmpp:carbons:2');

      pluginAPI.addPreSendMessageStanzaProcessor(this.preSendMessageStanzaProcessor);

      pluginAPI.registerConnectionHook((status, condition) => {
         if (status === 5 || status === 8) { //@TODO use constant for status
            this.init();
         }
      });
   }

   private preSendMessageStanzaProcessor = (message: Message, xmlElement: Strophe.Builder) => {
      let body = xmlElement.node.textContent;

      if (Options.get('carbons').enabled && body.match(/^\?OTR/)) {
         xmlElement.up().c("private", {
            xmlns: CONST.NS.CARBONS
         });
      }

      return Promise.resolve([message, xmlElement]);
   }

   private init() {
      let sessionStorage = this.pluginAPI.getSessionStorage();
      let inited = sessionStorage.getItem('carbons', 'inited') || false;

      if (!inited) {
         //@TODO enable carbons only if enabled by user

         this.enable().then(() => {
            sessionStorage.setItem('carbons', 'inited', true);
         });
      }
   }

   private enable() {
      var iq = $iq({
         type: 'set'
      }).c('enable', {
         xmlns: Namespace.get('CARBONS')
      });

      return this.pluginAPI.sendIQ(iq).then(() => {
         Log.debug('Carbons enabled');
      }).catch((stanza) => {
         Log.warn('Could not enable carbons');
      });
   }

   private disable(cb) {
      var iq = $iq({
         type: 'set'
      }).c('disable', {
         xmlns: Namespace.get('CARBONS')
      });

      return this.pluginAPI.sendIQ(iq).then(() => {
         Log.debug('Carbons disabled');
      }).catch((stanza) => {
         Log.warn('Could not disable carbons');
      });
   }

   private refresh(err) {

   }
}
