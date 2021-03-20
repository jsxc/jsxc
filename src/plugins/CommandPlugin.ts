import { AbstractPlugin, IMetaData } from '../plugin/AbstractPlugin';
import PluginAPI from '../plugin/PluginAPI';
import Translation from '@util/Translation';
import showCommandHelp from '@ui/dialogs/commandHelp';
import JID from '@src/JID';
import { OnlyGroupChatError, ArgumentError } from '@src/CommandRepository';
import MultiUserContact from '@src/MultiUserContact';

const MIN_VERSION = '4.0.0';
const MAX_VERSION = '99.0.0';

export default class CommandPlugin extends AbstractPlugin {
   public static getId(): string {
      return 'command';
   }

   public static getName(): string {
      return 'Commands';
   }

   public static getMetaData(): IMetaData {
      return {
         description: Translation.t('setting-command-enable'),
         xeps: [],
      };
   }

   constructor(pluginAPI: PluginAPI) {
      super(MIN_VERSION, MAX_VERSION, pluginAPI);

      this.register();
   }

   private register() {
      this.pluginAPI.registerCommand(
         '/help',
         async () => {
            showCommandHelp(this.pluginAPI.getCommandRepository().getHelp());

            return true;
         },
         'cmd_help'
      );

      this.pluginAPI.registerCommand(
         '/clear',
         async (_args, contact) => {
            contact.getChatWindow().clear();

            return true;
         },
         'cmd_clear'
      );

      const subjectChangeAction = async (args: string[], contact: MultiUserContact) => {
         if (!contact.isGroupChat()) {
            return false;
         }

         let topic = args.slice(1).join(' ');

         contact.changeTopic(topic);

         return true;
      };

      this.pluginAPI.registerCommand('/subject', subjectChangeAction, '', 'multiuser');
      this.pluginAPI.registerCommand('/topic', subjectChangeAction, 'cmd_subject', 'multiuser');

      this.pluginAPI.registerCommand(
         '/invite',
         async (args: string[], contact: MultiUserContact) => {
            if (!contact.isGroupChat()) {
               throw new OnlyGroupChatError();
            }

            if (args.length < 2) {
               throw new ArgumentError();
            }

            let jid = new JID(args[1]);
            let reason = args.slice(2).join(' ');

            contact.invite(jid, reason);

            return true;
         },
         'cmd_invite',
         'multiuser'
      );

      this.pluginAPI.registerCommand(
         '/kick',
         async (args: string[], contact: MultiUserContact) => {
            if (!contact.isGroupChat()) {
               throw new OnlyGroupChatError();
            }

            if (args.length < 2) {
               throw new ArgumentError();
            }

            let nickname = args[1];
            let reason = args.slice(2).join(' ');

            contact.kick(nickname, reason);

            return true;
         },
         'cmd_kick',
         'multiuser'
      );

      this.pluginAPI.registerCommand(
         '/ban',
         async (args: string[], contact: MultiUserContact) => {
            if (!contact.isGroupChat()) {
               throw new OnlyGroupChatError();
            }

            if (args.length < 2) {
               throw new ArgumentError();
            }

            let jid = new JID(args[1]);
            let reason = args.slice(2).join(' ');

            contact.ban(jid, reason);

            return true;
         },
         'cmd_ban',
         'multiuser'
      );

      const affiliationChangeActionFactory = (affiliation: 'admin' | 'member' | 'owner' | 'none') => async (
         args: string[],
         contact: MultiUserContact
      ) => {
         if (!contact.isGroupChat()) {
            throw new OnlyGroupChatError();
         }

         if (args.length !== 2) {
            throw new ArgumentError();
         }

         let jid = new JID(args[1]);

         contact.changeAffiliation(jid, affiliation);

         return true;
      };

      this.pluginAPI.registerCommand('/admin', affiliationChangeActionFactory('admin'), 'cmd_admin', 'multiuser');
      this.pluginAPI.registerCommand('/member', affiliationChangeActionFactory('member'), 'cmd_member', 'multiuser');
      this.pluginAPI.registerCommand('/owner', affiliationChangeActionFactory('owner'), 'cmd_owner', 'multiuser');
      this.pluginAPI.registerCommand('/revoke', affiliationChangeActionFactory('none'), 'cmd_revoke', 'multiuser');

      this.pluginAPI.registerCommand(
         '/nick',
         async (args: string[], contact: MultiUserContact) => {
            if (!contact.isGroupChat()) {
               throw new OnlyGroupChatError();
            }

            if (args.length !== 2) {
               throw new ArgumentError();
            }

            contact.changeNickname(args[1]);

            return true;
         },
         'cmd_nick',
         'multiuser'
      );

      this.pluginAPI.registerCommand(
         '/destroy',
         async (args: string[], contact: MultiUserContact) => {
            if (!contact.isGroupChat()) {
               throw new OnlyGroupChatError();
            }

            contact.destroy();

            return true;
         },
         'cmd_destroy',
         'multiuser'
      );

      const roleChangeActionFactory = (role: 'moderator' | 'participant') => async (
         args: string[],
         contact: MultiUserContact
      ) => {
         if (!contact.isGroupChat()) {
            throw new OnlyGroupChatError();
         }

         if (args.length !== 2) {
            throw new ArgumentError();
         }

         let nickname = args[1];

         contact.changeRole(nickname, role);

         return true;
      };

      this.pluginAPI.registerCommand('/moderator', roleChangeActionFactory('moderator'), 'cmd_moderator', 'multiuser');
      this.pluginAPI.registerCommand(
         '/participant',
         roleChangeActionFactory('participant'),
         'cmd_participant',
         'multiuser'
      );
   }
}
