import Menu from './Menu';
import { Presence } from '@connection/AbstractConnection';
import Client from './Client';
import Translation from '@util/Translation';

function handlerFactory(requestedPresence: Presence) {
   return () => {
      let oldPresence = Client.getPresenceController().getTargetPresence();

      if (Client.getAccountManager().getAccount()) {
         Client.getPresenceController().setTargetPresence(requestedPresence);
      }

      if (oldPresence === Presence.offline && requestedPresence === Presence.online) {
         let onUserRequestsToGoOnline = Client.getOption('onUserRequestsToGoOnline');

         if (typeof onUserRequestsToGoOnline === 'function') {
            onUserRequestsToGoOnline();
         }
      }
   };
}

export default class MenuPresence extends Menu {
   constructor() {
      super([{
         label: Translation.t('Online'),
         handler: handlerFactory(Presence.online),
         classNames: 'jsxc-online jsxc-offline-available',
      }, {
         label: Translation.t('Chatty'),
         handler: handlerFactory(Presence.chat),
         classNames: 'jsxc-chat',
      }, {
         label: Translation.t('Away'),
         handler: handlerFactory(Presence.away),
         classNames: 'jsxc-away',
      }, {
         label: Translation.t('Extended away'),
         handler: handlerFactory(Presence.xa),
         classNames: 'jsxc-xa',
      }, {
         label: Translation.t('dnd'),
         handler: handlerFactory(Presence.dnd),
         classNames: 'jsxc-dnd',
      }, {
         label: Translation.t('Offline'),
         handler: handlerFactory(Presence.offline),
         classNames: 'jsxc-offline',
      }])
   }
}
