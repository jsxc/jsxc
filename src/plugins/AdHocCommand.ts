import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import showAdHocCommandDialog from '../ui/dialogs/adhocCommands';
import Roster from '../ui/Roster';
import Translation from '../util/Translation';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const NAMESPACE_ADHOC_COMMAND = 'http://jabber.org/protocol/commands';
const NAMESPACE_DISCO_ITEMS = 'http://jabber.org/protocol/disco#items';

export default class AdHocCommandPlugin extends AbstractPlugin {
   private static rosterMenuEntryAdded = false;

   public static getId(): string {
      return 'adhoc-command';
   }

   public static getName(): string {
      return 'AdHoc Command';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-adhoc-command-enable'),
         xeps: [
            {
               id: 'XEP-0050',
               name: 'AdHoc Command',
               version: '1.3.0',
            },
         ],
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.addFeature(NAMESPACE_ADHOC_COMMAND);

      if (!AdHocCommandPlugin.rosterMenuEntryAdded) {
         AdHocCommandPlugin.rosterMenuEntryAdded = true;

         let roster = Roster.get();

         roster.addMenuEntry({
            id: 'adhoc-command',
            handler: showAdHocCommandDialog,
            label: Translation.t('AdHocCommands'),
         });
      }
   }

   public async requestAdHocCommands(): Promise<{ jid: string; node: string; name: string }[]> {
      let iq = $iq({
         type: 'get',
      }).c('query', {
         xmlns: NAMESPACE_DISCO_ITEMS,
         node: NAMESPACE_ADHOC_COMMAND,
      });

      if (!(await this.hasSupport())) {
         this.pluginAPI.Log.info('This server does not support adHoc commands');

         return [];
      }

      let stanza = await this.pluginAPI.sendIQ(iq);
      let query = $(stanza).find(`query[node="${NAMESPACE_ADHOC_COMMAND}"]`);

      return query
         .find('> item')
         .map(function (index, item) {
            return { jid: $(item).attr('jid').toLowerCase(), node: $(item).attr('node'), name: $(item).attr('name') };
         })
         .get();
   }

   public hasSupport(): Promise<boolean> {
      return this.pluginAPI.getDiscoInfoRepository().hasFeature(undefined, NAMESPACE_ADHOC_COMMAND);
   }

   public async getCommandForm(command: { jid: string; node: string }): Promise<Element> {
      let iq = $iq({
         to: command.jid,
         type: 'set',
      }).c('command', {
         xmlns: NAMESPACE_ADHOC_COMMAND,
         node: command.node,
         action: 'execute',
      });

      return this.pluginAPI.sendIQ(iq);
   }

   public executeForm(jid: string, node: string, session: string, form): Promise<Element> {
      let iq = $iq({
         to: jid,
         type: 'set',
      })
         .c('command', {
            xmlns: NAMESPACE_ADHOC_COMMAND,
            node,
            action: 'complete',
            sessionid: session,
         })
         .cnode(form.toXML());

      return this.pluginAPI.sendIQ(iq);
   }

   public cancelForm(jid: string, node: string, session: string): Promise<Element> {
      let iq = $iq({
         to: jid,
         type: 'set',
      }).c('command', {
         xmlns: NAMESPACE_ADHOC_COMMAND,
         node,
         action: 'cancel',
         sessionid: session,
      });

      return this.pluginAPI.sendIQ(iq);
   }
}
