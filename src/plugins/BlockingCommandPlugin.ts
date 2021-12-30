import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import { Status } from '../vendor/Strophe';
import showContactBlockDialog from '../ui/dialogs/contactBlock';
import Roster from '../ui/Roster';
import { IContact } from '@src/Contact.interface';
import { IMessage } from '@src/Message.interface';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

const NAMESPACE_BLOCKING_COMMAND = 'urn:xmpp:blocking';

export default class BlockingCommandPlugin extends AbstractPlugin {
   private static rosterMenuEntryAdded = false;

   public static getId(): string {
      return 'blocking-command';
   }

   public static getName(): string {
      return 'Blocking Command';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-blocking-command-enable'),
         xeps: [
            {
               id: 'XEP-0191',
               name: 'Blocking Command',
               version: '1.3',
            },
         ],
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      pluginAPI.getSessionStorage().registerHook('blocklist', this.onBlocklistChanged);

      let connection = pluginAPI.getConnection();

      pluginAPI.addFeature(NAMESPACE_BLOCKING_COMMAND);
      pluginAPI.addAfterReceiveErrorMessageProcessor(this.errorMessageProcessor);

      connection.registerHandler(this.onBlocklistUpdate, NAMESPACE_BLOCKING_COMMAND, 'iq', 'set');

      pluginAPI.registerConnectionHook(status => {
         if (status === Status.ATTACHED) {
            this.getBlocklist().then(list => this.onBlocklistChanged(list));
         }
      });

      if (!BlockingCommandPlugin.rosterMenuEntryAdded) {
         BlockingCommandPlugin.rosterMenuEntryAdded = true;

         let roster = Roster.get();

         roster.addMenuEntry({
            id: 'block-contacts',
            handler: showContactBlockDialog,
            label: Translation.t('Blocking_users'),
         });
      }
   }

   public async getBlocklist(): Promise<string[]> {
      let sessionStorage = this.pluginAPI.getSessionStorage();
      let blocklist: string[] = sessionStorage.getItem('blocklist');

      if (!blocklist) {
         blocklist = await this.requestBlocklist();

         sessionStorage.setItem('blocklist', blocklist);
      }

      return blocklist;
   }

   private async requestBlocklist(): Promise<string[]> {
      let iq = $iq({
         type: 'get',
      }).c('blocklist', {
         xmlns: NAMESPACE_BLOCKING_COMMAND,
      });

      if (!(await this.hasSupport())) {
         this.pluginAPI.Log.info('This server does not support blocking command');

         return [];
      }

      let stanza = await this.pluginAPI.sendIQ(iq);
      let blocklistElement = $(stanza).find(`blocklist[xmlns="${NAMESPACE_BLOCKING_COMMAND}"]`);

      return blocklistElement
         .find('> item')
         .map(function (index, item) {
            return $(item).attr('jid').toLowerCase();
         })
         .get();
   }

   public hasSupport(): Promise<boolean> {
      return this.pluginAPI.getDiscoInfoRepository().hasFeature(undefined, NAMESPACE_BLOCKING_COMMAND);
   }

   public block(items: string[]): Promise<Element> {
      if (!items || items.length === 0) {
         return Promise.reject();
      }

      let iq = $iq({
         type: 'set',
      }).c('block', {
         xmlns: NAMESPACE_BLOCKING_COMMAND,
      });

      for (let itm of items) {
         iq.c('item', { jid: itm }).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }

   public unblock(items: string[]): Promise<Element> {
      let iq = $iq({
         type: 'set',
      }).c('unblock', {
         xmlns: NAMESPACE_BLOCKING_COMMAND,
      });

      for (let itm of items) {
         iq.c('item', { jid: itm }).up();
      }

      return this.pluginAPI.sendIQ(iq);
   }

   private onBlocklistChanged = (newList, oldList = []) => {
      let accountUid = this.pluginAPI.getAccountUid();
      let unblockedJids: string[] = <any>$(oldList)
         .not(newList as any)
         .get();
      let blockedJids: string[] = <any>$(newList)
         .not(oldList as any)
         .get();

      const getElements = (jid: string) => {
         return jid.includes('@')
            ? $(`[data-account-uid="${accountUid}"][data-jid="${jid}"]`)
            : $(`[data-account-uid="${accountUid}"][data-jid$="${jid}"]`);
      };

      unblockedJids.forEach(jid => {
         if (!newList.includes(jid)) {
            getElements(jid).removeClass('jsxc-blocked');
         }
      });

      setTimeout(() => {
         // on login it could happen, that blocklist was loaded before roster, so wait 2seconds to update roster...
         blockedJids.forEach(jid => getElements(jid).addClass('jsxc-blocked'));
      }, 2000);
   };

   private onBlocklistUpdate = (stanza: string) => {
      let sessionStorage = this.pluginAPI.getSessionStorage();
      let blocklist = sessionStorage.getItem('blocklist') || [];

      if ($(stanza).children('unblock').length > 0) {
         if ($(stanza).find('unblock > item').length === 0) {
            blocklist = [];
         }

         $(stanza)
            .find('unblock > item')
            .each(function (index, item) {
               let jidString = $(item).attr('jid');

               if (blocklist.includes(jidString)) {
                  blocklist = blocklist.filter(entry => entry !== jidString);
               }
            });
      }

      if ($(stanza).children('block').length > 0) {
         $(stanza)
            .find('block > item')
            .each(function (index, item) {
               let jidString = $(item).attr('jid');

               if (!blocklist.includes(jidString)) {
                  blocklist.push(jidString);
               }
            });
      }

      sessionStorage.setItem('blocklist', blocklist);

      return true;
   };

   private errorMessageProcessor = async (
      contact: IContact,
      message: IMessage,
      stanza: Element
   ): Promise<[IContact, IMessage, Element]> => {
      if (message && $(stanza).find(`blocked[xmlns="${NAMESPACE_BLOCKING_COMMAND}:errors"]`).length === 1) {
         message.setErrorMessage(Translation.t('You_have_blocked_this_JID'));
      }

      return [contact, message, stanza];
   };
}
