import Translation from '@util/Translation';
import { IContact } from './Contact.interface';
import MultiUserContact from './MultiUserContact';

export class OnlyGroupChatError extends Error {
   constructor() {
      super(Translation.t('Command_only_available_in_groupchat'));
   }
}
export class ArgumentError extends Error {
   constructor() {
      super(Translation.t('Wrong_number_of_arguments'));
   }
}

export type CommandAction = (args: string[], contact: IContact | MultiUserContact) => Promise<boolean>;

export default class CommandRepository {
   private commands: {
      [command: string]: {
         action: CommandAction;
         description: string;
         category: string;
      };
   } = {};

   public register(command: string, action: CommandAction, description: string, category: string = 'general') {
      if (command && !this.commands[command.toLowerCase()]) {
         this.commands[command.toLowerCase()] = {
            action,
            description,
            category,
         };
      }
   }

   public execute(message: string, contact: IContact | MultiUserContact) {
      let args = message.split(' ').filter(arg => !!arg);

      if (args.length === 0) {
         return Promise.resolve(false);
      }

      let command = args[0].toLowerCase();

      if (!this.commands[command]) {
         return Promise.resolve(false);
      }

      return this.commands[command].action(args, contact);
   }

   public getHelp() {
      let help: {
         [category: string]: { command: string; description: string }[];
      } = {};

      Object.keys(this.commands)
         .sort()
         .forEach(id => {
            let command = this.commands[id];

            if (!command.description) {
               return;
            }

            if (!help[command.category]) {
               help[command.category] = [];
            }

            help[command.category].push({
               command: id,
               description: command.description,
            });
         });

      return Object.keys(help)
         .sort()
         .map(category => ({
            label: 'cmd_category_' + category,
            commands: help[category],
         }));
   }
}
