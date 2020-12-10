import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Translation from '@util/Translation';
import * as Namespace from '@connection/xmpp/namespace';
import { $iq } from '@vendor/Strophe';

/**
 * XEP-0199: XMPP Ping
 *
 * @version: 2.0.1
 * @see: https://xmpp.org/extensions/xep-0199.html
 *
 * A simple implementation of Server-to-Client pings,
 * as part of the XMPP Ping Protocol Extension.
 *
 * A reply will be sent only to stanzas originating from the server.
 * Otherwise, an error will be sent.
 *
 * Per XEP-0199, the "from" attribute should be the server domain.
 * Requests with account's bare jid as "from" would be allowed,
 * as some server implementations send pings this way (Ejabberd, e.g.).
 *
 */

const PING = 'urn:xmpp:ping';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

Namespace.register('PING', PING);

export default class PingPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'ping';
   }

   public static getName(): string {
      return 'Ping';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-ping-enable'),
         xeps: [{
            id: 'XEP-0199',
            name: 'Ping',
            version: '2.0.1',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.pluginAPI.addFeature(PING);

      this.pluginAPI.getConnection().registerHandler(this.onPing, PING, 'iq', null);

   }

   private onPing = (stanza: string): boolean => {
      let stanzaElement = $(stanza);

      let jid = this.pluginAPI.getConnection().getJID();
      let fromAttribute = stanzaElement.attr('from');
      let id = stanzaElement.attr('id');
      let isValidServerToClientPing = fromAttribute === jid.bare || fromAttribute === jid.domain;

      let iq = isValidServerToClientPing ?
         $iq({
            to: fromAttribute,
            from: jid.full,
            type: 'result',
            id,
         })
         :
         $iq({
            to: fromAttribute,
            from: jid.full,
            type: 'error',
            id,
         })
            .c('ping', {
               xmlns: PING
            })
            .up()
            .c('error', {
               type: 'cancel'
            })
            .c('service-unavailable', {
               xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'
            });

      this.pluginAPI.send(iq);

      return true;
   }
}
