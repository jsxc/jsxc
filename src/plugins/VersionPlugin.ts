import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import Client from '../Client';
import JID from '../JID';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const NAMESPACE_VERSION = 'jabber:iq:version';

export default class VersionPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'version';
   }

   public static getName(): string {
      return 'Software Version';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-version'),
         xeps: [
            {
               id: 'XEP-0092',
               name: 'Software Version',
               version: '1.1',
            },
         ],
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addFeature(NAMESPACE_VERSION);

      let connection = pluginAPI.getConnection();
      connection.registerHandler(this.onReceiveQuery, NAMESPACE_VERSION, 'iq');
   }

   //query information from contact
   public queryVersion(jid: JID): Promise<Element> {
      let iq = $iq({
         type: 'get',
         to: jid.full,
         xmlns: 'jabber:client',
      }).c('query', {
         xmlns: NAMESPACE_VERSION,
      });

      return this.pluginAPI.sendIQ(iq);
   }

   //send information response
   private sendResponse(idstr: string, jid: string, name?: string, version?: string, os?: string): Promise<Element> {
      let iq = $iq({
         type: 'result',
         to: jid,
         id: idstr,
         xmlns: 'jabber:client',
      }).c('query', {
         xmlns: NAMESPACE_VERSION,
      });

      if (name) {
         iq.c('name').t(name).up();
      }

      if (version) {
         iq.c('version').t(version).up();
      }

      if (os) {
         iq.c('os').t(os).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }

   private onReceiveQuery = (stanza: string) => {
      let element = $(stanza);
      let fromjid = new JID(element.attr('from'));
      let tojid = new JID(element.attr('to'));
      let type = element.attr('type');
      let id = element.attr('id');

      if (
         type === 'get' &&
         (this.pluginAPI.getContact(fromjid) || //only send to contacts
            tojid.domain === fromjid.bare) //or own domain server
      ) {
         let OSName = '';
         let includeOS = Client.getOption<boolean>('includeOSInVersionResponse', false);

         if (includeOS) {
            if (navigator.appVersion.indexOf('Win') !== -1) OSName = 'Windows';
            if (navigator.appVersion.indexOf('Mac') !== -1) OSName = 'MacOS';
            if (navigator.appVersion.indexOf('X11') !== -1) OSName = 'UNIX';
            if (navigator.appVersion.indexOf('Linux') !== -1) OSName = 'Linux';

            let userAgent = navigator.userAgent || navigator.vendor || (<any>window).opera;

            if (/android/i.test(userAgent)) {
               OSName = 'Android';
            }

            if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
               OSName = 'iOS';
            }
         }

         this.sendResponse(id, fromjid.full, 'JSXC', Client.getVersion(), OSName);
      }

      return true;
   };
}
