import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin'
import PluginAPI from '../plugin/PluginAPI'
import Translation from '@util/Translation';
import JID from '../JID'

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const NAMESPACE_TIME = 'urn:xmpp:time'

export default class TimePlugin extends AbstractPlugin {

   protected pluginAPI: PluginAPI;

   public static getId(): string {
      return 'time';
   }

   public static getName(): string {
      return 'Entity Time';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-time'),
         xeps: [{
            id: 'XEP-0202',
            name: 'Entity Time',
            version: '2.0',
         }]
      }
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      let connection = pluginAPI.getConnection();
      this.pluginAPI=pluginAPI;
      pluginAPI.addFeature(NAMESPACE_TIME);

      connection.registerHandler(this.onReceiveQuery, NAMESPACE_TIME, 'iq');

   }

   //query information from contact
   public query(jid: JID): Promise<{}>
   {
      let iq = $iq({
         type: 'get',
         to: jid.full,
         xmlns: 'jabber:client'
      }).c('query', {
         'xmlns': NAMESPACE_TIME
      });

      return this.pluginAPI.sendIQ(iq);
   }

   //send information response
   public sendResponse(idstr: string, jid: string, tzo?: string, utc?: string): Promise<{}>
   {
      let iq = $iq({
         type: 'result',
         to: jid,
         id: idstr,
         xmlns: 'jabber:client'
      }).c('query', {
         'xmlns': NAMESPACE_TIME
      });

      if (tzo)
      {
          iq.c('tzo').t(tzo).up();
      }

      if (utc)
      {
          iq.c('utc').t(utc).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }

   private onReceiveQuery = (stanza) => {
        let fromjid = new JID($(stanza).attr('from'));
        let tojid = new JID($(stanza).attr('to'));
        let type = $(stanza).attr('type');

        if (type==='get'&&
           (this.pluginAPI.getContact(fromjid)|| //only send to contacts
            tojid.domain===fromjid.bare)) //or own domain server
        {
            let time = new Date();
            let utc = time.toISOString();
            let tzo = ((time.getTimezoneOffset()*-1)/60).toString();
            tzo = tzo[0]==='0'?tzo+':00':'0'+tzo+':00';

            this.sendResponse($(stanza).attr('id'),$(stanza).attr('from'),tzo.toString(),utc);
        }
        return true;
   }
}
