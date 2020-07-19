import Menu from './Menu';
import Translation from '@util/Translation';
import showContactDialog from './ui/dialogs/contact'
import showAboutDialog from './ui/dialogs/about'
import showMultiUserJoinDialog from './ui/dialogs/multiUserJoin'
import showSettingsDialog from './ui/dialogs/settings'
import Client from './Client';

const HELP_KEY = 'onlineHelp';
const HIDE_OFFLINE_KEY = 'hideOfflineContacts';

const openOnlineHelp = () => {
   let onlineHelpUrl = Client.getOption(HELP_KEY);

   window.location = onlineHelpUrl;
};

const toggleOffline = () => {
   let hideOffline = !Client.getOption(HIDE_OFFLINE_KEY);

   Client.setOption(HIDE_OFFLINE_KEY, hideOffline);
};

const toggleMuteNotification = () => {
   let muteNotification = !Client.getOption('notification.mute');

   Client.setOption('notification.mute', muteNotification);
};

export default class MenuMain extends Menu {
   constructor() {
      super([
         {
            label: Translation.t('About'),
            handler: showAboutDialog,
            classNames: 'jsxc-offline-available',
         }, {
            label: Translation.t('Online_help'),
            handler: openOnlineHelp,
            icon: 'help',
            classNames: 'jsxc-offline-available',
         }, {
            label: Translation.t('Add_buddy'),
            handler: showContactDialog,
            icon: 'contact',
         }, {
            label: Translation.t('Hide_offline'),
            handler: toggleOffline
         }, {
            label: Translation.t('Mute'),
            handler: toggleMuteNotification,
         }, {
            label: Translation.t('Join_chat'),
            handler: showMultiUserJoinDialog,
            icon: 'groupcontact',
         }, {
            label: Translation.t('Settings'),
            handler: showSettingsDialog,
            icon: 'settings',
            classNames: 'jsxc-offline-available',
         }
      ])
   }
}
