import Options from '../Options'
import Templates from '../util/Templates'
import showSettings from './dialogs/settings'
import showContactDialog from './dialogs/contact'
import showAboutDialog from './dialogs/about'
import showMultiUserJoinDialog from './dialogs/multiUserJoin'
import * as CONST from '../CONST'
import RosterItem from './RosterItem'
import showLoginBox from './dialogs/loginBox'
import Menu from './util/Menu'
import { IContact } from '../Contact.interface'
import WindowList from './ChatWindowList'
import Client from '../Client'
import Storage from '../Storage'
import PersistentMap from '../util/PersistentMap'
import Account from '../Account'
import Translation from '../util/Translation'
import AvatarSet from './AvatarSet'
import { Notice } from '../Notice'
import { Presence } from '../connection/AbstractConnection'
import { NoticeManager } from '../NoticeManager'
import ClientAvatar from '../ClientAvatar'
//import rosterTemplate from '../../template/roster.hbs'
let rosterTemplate = require('../../template/roster.hbs')

export default class Roster {

   private element: JQuery;
   private contactList: JQuery;
   private storage: Storage;
   private options: PersistentMap;

   private static instance: Roster;
   private static hidden: boolean;

   public static init(): void {
      Roster.get();
   }

   public static get(): Roster {
      if (!Roster.instance) {
         Roster.instance = new Roster();
      }

      return Roster.instance;
   }

   public static hide() {
      Roster.hidden = true;

      if (Roster.instance) {
         Roster.instance.hide();
      }
   }

   public static show() {
      Roster.hidden = false;

      if (Roster.instance) {
         Roster.instance.show();
      }
   }

   private constructor() {
      let template = rosterTemplate({
         onlineHelpUrl: Client.getOption('onlineHelp')
      });
      this.element = $(template);
      if (Roster.hidden) {
         this.hide();
      }
      this.element.appendTo(Client.getOption('rosterAppend') + ':first');

      this.contactList = this.element.find('.jsxc-contact-list');

      this.storage = Client.getStorage();
      this.options = new PersistentMap(this.storage, 'roster');

      this.addMainMenuEntries();
      this.registerPresenceHandler();
      this.registerToggleHandler();

      Menu.init(this.element.find('.jsxc-menu'));

      ClientAvatar.get().addElement(this.element.find('.jsxc-bottom .jsxc-avatar'));

      this.initOptions();
   }

   public show() {
      this.element.show();
   }

   public hide() {
      this.element.hide();
   }

   public startProcessing(msg?: string) {
      this.element.addClass('jsxc-processing');

      if (msg) {
         let spanElement = this.element.find('.jsxc-menu-presence > span');
         spanElement.addClass('jsxc-waiting');

         if (!spanElement.data('previousText')) {
            spanElement.data('previousText', spanElement.text());
         }

         spanElement.text(msg);
      }
   }

   public endProcessing() {
      this.element.removeClass('jsxc-processing');

      let spanElement = this.element.find('.jsxc-menu-presence > span');
      spanElement.removeClass('jsxc-waiting');

      let previousText = spanElement.data('previousText');
      spanElement.data('previousText', undefined);

      if (previousText) {
         spanElement.text(previousText);
      }

      this.refreshOwnPresenceIndicator();
   }

   public add(contact: IContact) {
      this.clearStatus();

      if (this.element.find('.jsxc-roster-item[data-id="' + contact.getId() + '"]').length > 0) {
         return;
      }

      let rosterItem = new RosterItem(contact);
      this.insert(rosterItem);

      contact.registerHook('presence', () => {
         rosterItem.getDom().detach();

         this.insert(rosterItem);
      });

      contact.registerHook('subscription', () => {
         rosterItem.getDom().detach();

         this.insert(rosterItem);
      });
   }

   public remove(contact: IContact) {
      let rosterItemElement = this.element.find('.jsxc-roster-item[data-id="' + contact.getId() + '"]');

      if (rosterItemElement.length === 0) {
         return;
      }

      rosterItemElement.remove();

      //@TODO check if we are still connected and if we have to display an "your roster is empty" warning
   }

   public clearStatus() {
      this.element.find('.jsxc-roster-status').empty();

      this.element.removeClass('jsxc-status-show');
   }

   public setStatus(statusElement: JQuery) {
      this.element.find('.jsxc-roster-status').empty().append(statusElement);

      this.element.addClass('jsxc-status-show');
   }

   public setNoConnection() {
      let linkElement = $('<a>');
      linkElement.text('relogin');
      linkElement.click(<any>showLoginBox);

      let statusElement = $('<p>');
      statusElement.text('no_connection');
      statusElement.append(linkElement);

      this.setStatus(statusElement);
   }

   public setEmptyContactList() {
      let statusElement = $('<p>');
      statusElement.text(Translation.t('Your_roster_is_empty_add_'));
      statusElement.find('a').click(<any>showContactDialog);
      statusElement.append('.');

      this.setStatus(statusElement);
   }

   public refreshOwnPresenceIndicator() {
      let confirmedPresence = Client.getPresenceController().getCurrentPresence();
      let requestedPresence = Client.getPresenceController().getTargetPresence();
      let presence = typeof requestedPresence === 'number' ? requestedPresence : confirmedPresence;

      let label = $('.jsxc-menu-presence .jsxc-' + Presence[presence]).text();
      let labelElement = this.element.find('.jsxc-menu-presence > span');

      labelElement.text(label);
      this.element.attr('data-presence', Presence[confirmedPresence]);

      if (requestedPresence === confirmedPresence) {
         labelElement.removeClass('jsxc-waiting');
      } else {
         labelElement.addClass('jsxc-waiting');
      }
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      this.options.registerHook(property, func);
   }

   public addNotice(manager: NoticeManager, notice: Notice) {
      let noticeListElement = $('#jsxc-notice ul');
      let noticeElement = $('<li/>');

      noticeElement.click(function(ev) {
         ev.stopPropagation();
         ev.preventDefault();

         notice.callFunction();

         manager.removeNotice(notice);
      });

      noticeElement.addClass('jsxc-icon-' + notice.getType());

      noticeElement.text(notice.getTitle());
      noticeElement.attr('title', notice.getDescription());
      noticeElement.attr('data-notice-id', notice.getId());
      noticeElement.attr('data-manager-id', manager.getId());
      noticeListElement.append(noticeElement);

      $('#jsxc-notice > span').text(noticeListElement.find('li').length);
   }

   public removeNotice(manager: NoticeManager, noticeId: string) {
      let managerId = manager.getId() || '';
      let noticeElement = $('#jsxc-notice li').filter(function() {
         return $(this).attr('data-notice-id') === noticeId &&
            ($(this).attr('data-manager-id') || '') === managerId;
      });

      noticeElement.remove();

      let numberOfNotices = $('#jsxc-notice li').length;
      $('#jsxc-notice > span').text(numberOfNotices > 0 ? numberOfNotices : '');
   }

   public addMenuEntry(options: { id: string, handler: (ev) => void, label: string | JQuery<HTMLElement>, icon?: string, offlineAvailable?: boolean }) {
      const { id, handler, label, icon, offlineAvailable } = options;
      let li = $('<li>');

      if (!id || !handler || !label) {
         throw 'id, handler and label required for menu entry';
      }

      if (typeof label === 'string') {
         li.text(label);
      } else {
         li.append(label);
      }

      li.addClass('jsxc-' + id.toLowerCase().replace(' ', '-'));

      if (offlineAvailable) {
         li.addClass('jsxc-offline-available');
      }

      if (icon) {
         li.addClass('jsxc-icon-' + icon);
      }

      ((li, handler) => li.click(ev => {
         let presence = Client.getPresenceController().getCurrentPresence();

         if (presence === Presence.offline && !li.hasClass('jsxc-offline-available')) {
            return;
         }

         return handler(ev);
      }))(li, handler);

      let mainMenu = this.element.find('.jsxc-menu-main .jsxc-inner ul');
      mainMenu.prepend(li);
   }

   private insert(rosterItem: RosterItem) {
      let contactList = this.contactList;
      let insert = false;
      let contact = rosterItem.getContact();

      // Insert buddy with no mutual friendship to the end
      let presence = (contact.getSubscription() === 'both') ? contact.getPresence() : Presence.offline + 1;

      contactList.children().each(function() {
         var pointer = $(this);
         var pointerSubscription = pointer.data('subscription');
         var pointerPresence = (pointerSubscription === 'both') ? Presence[pointer.data('presence')] : Presence.offline + 1;
         let pointerName = pointer.find('.jsxc-name').text();

         if ((pointerName.toLowerCase() > contact.getName().toLowerCase() && pointerPresence === presence) || pointerPresence > presence) {

            pointer.before(rosterItem.getDom());
            insert = true;

            return false;
         }
      });

      if (!insert) {
         rosterItem.getDom().appendTo(contactList);
      }
   }

   private addMainMenuEntries() {
      this.addMenuEntry({
         id: 'about',
         handler: showAboutDialog,
         label: Translation.t("About"),
         offlineAvailable: true,
      });

      this.addMenuEntry({
         id: 'online-help',
         handler: function(ev) { },
         label: $(`<a href="#" target="_blank">${Translation.t("Online_help")}</a>`),
         offlineAvailable: true,
         icon: 'help',
      });

      this.addMenuEntry({
         id: 'add-contact',
         handler: showContactDialog,
         label: Translation.t("Add_buddy"),
         icon: 'contact'
      });

      this.addMenuEntry({
         id: 'hide-offline',
         handler: this.toggleOffline,
         label: $(`<span class="jsxc-hide-offline">${Translation.t("Hide_offline")}</span>
                   <span class="jsxc-show-offline">${Translation.t("Show_offline")}</span>`),
      });

      this.addMenuEntry({
         id: 'mute-notification',
         handler: this.muteNotification,
         label: Translation.t("Mute"),
      });

      this.addMenuEntry({
         id: 'join-muc',
         handler: showMultiUserJoinDialog,
         label: Translation.t("Join_chat"),
         icon: 'groupcontact'
      });

      this.addMenuEntry({
         id: 'settings',
         handler: showMultiUserJoinDialog,
         label: Translation.t("Settings"),
         offlineAvailable: true,
         icon: 'setting'
      });
   }

   private registerPresenceHandler() {
      let self = this;
      let options = this.options;

      this.element.find('.jsxc-menu-presence li').click(function() {
         let presenceString = <string>$(this).data('presence');
         let oldPresence = Presence[options.get('presence')] || Presence.offline;
         let requestedPresence = Presence[presenceString];

         if (Client.getAccount()) {
            Client.getPresenceController().setTargetPresence(requestedPresence);
         }

         if (oldPresence === Presence.offline && requestedPresence !== Presence.offline) {
            let onUserRequestsToGoOnline = Client.getOption('onUserRequestsToGoOnline');

            if (typeof onUserRequestsToGoOnline === 'function') {
               onUserRequestsToGoOnline();
            }
         }
      });
   }

   private registerToggleHandler() {
      this.element.find('.jsxc-roster-toggle').click(this.toggle);
   }

   private toggleOffline = (ev) => {
      var hideOffline = !this.options.get('hideOffline');

      this.options.set('hideOffline', hideOffline);
   }

   private hideOffline(yes: boolean) {
      if (yes) {
         this.contactList.addClass('jsxc-hide-offline');
      } else {
         this.contactList.removeClass('jsxc-hide-offline');
      }
   }

   private muteNotification = () => {
      // if (jsxc.storage.getUserItem('presence') === 'dnd') {
      //    return;
      // }
      //
      // // invert current choice
      // var mute = !jsxc.options.get('muteNotification');
      //
      // if (mute) {
      //    jsxc.notification.muteSound();
      // } else {
      //    jsxc.notification.unmuteSound();
      // }
   }

   private toggle = () => {
      let state = this.options.get('visibility');

      state = (state === CONST.HIDDEN) ? CONST.SHOWN : CONST.HIDDEN;

      this.options.set('visibility', state);
   }

   private setVisibility(state: string) {
      if (state === CONST.SHOWN && Client.isExtraSmallDevice()) {
         WindowList.get().minimizeAll();
      }

      $('body').removeClass('jsxc-roster-hidden jsxc-roster-shown');
      $('body').addClass('jsxc-roster-' + state);
   }

   private initOptions() {
      let hideOffline = this.options.get('hideOffline'); console.log('hideOffline', hideOffline, typeof hideOffline)
      hideOffline = (typeof hideOffline === 'boolean') ? hideOffline : Client.getOption('hideOffline');
      this.hideOffline(hideOffline);
      this.options.registerHook('hideOffline', (hideOffline) => {
         this.hideOffline(hideOffline);
      });

      //@TODO || (Client.getOption('loginForm').startMinimized ? CONST.HIDDEN : CONST.SHOWN
      let rosterState = this.options.get('visibility');
      this.setVisibility(rosterState);
      this.options.registerHook('visibility', (visibility) => {
         this.setVisibility(visibility);
      });

      this.refreshOwnPresenceIndicator();
      Client.getPresenceController().registerTargetPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });
      Client.getPresenceController().registerCurrentPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });
   }
}
