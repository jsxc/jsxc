import showContactDialog from './dialogs/contact';
import showContactSearchDialog from './dialogs/contactsearch';
import showAboutDialog from './dialogs/about';
import showMultiUserJoinDialog from './dialogs/multiUserJoin';
import showSettingsDialog from './dialogs/settings';
import * as CONST from '../CONST';
import RosterItem from './RosterItem';
import Menu from './util/Menu';
import { IContact } from '../Contact.interface';
import WindowList from './ChatWindowList';
import Client from '../Client';
import Translation from '../util/Translation';
import showSetExStatusDialog from './dialogs/exstatus';
import { Notice, TYPE } from '../Notice';
import { Presence } from '../connection/AbstractConnection';
import { NoticeManager } from '../NoticeManager';
import ClientAvatar from '../ClientAvatar';
import confirmDialog from './dialogs/confirm';
import Utils from '@util/Utils';
import Emoticons from '@src/Emoticons';
import showAddAvatarDialog from './dialogs/avatarupload';
import JID from '@src/JID';

let rosterTemplate = require('../../template/roster.hbs');

const APPEND_KEY = 'rosterAppend';
const VISIBILITY_KEY = 'rosterVisibility';
const HELP_KEY = 'onlineHelp';
const HIDE_OFFLINE_KEY = 'hideOfflineContacts';

export default class Roster {
   private element: JQuery;
   private contactList: JQuery;
   private groupList: JQuery;
   private rosterItems: { [uid: string]: RosterItem } = {};

   private static instance: Roster;

   public static init(): void {
      Roster.get();
   }

   public static get(): Roster {
      if (!Roster.instance) {
         Roster.instance = new Roster();

         Client.getNoticeManager();
      }

      return Roster.instance;
   }

   private constructor() {
      let template = rosterTemplate();
      this.element = $(template);

      this.element.appendTo(Client.getOption(APPEND_KEY) + ':first');

      //make sure css empty selector works
      $('.jsxc-js-notice-menu .jsxc-menu__button').text('');

      this.contactList = this.element.find('.jsxc-contact-list');
      this.groupList = this.element.find('.jsxc-group-list');

      this.addMainMenuEntries();
      this.registerPresenceHandler();
      this.registerToggleHandler();

      Menu.init(this.element.find('.jsxc-menu'));

      ClientAvatar.get().addElement(this.element.find('.jsxc-bottom .jsxc-avatar'));

      this.initOptions();
      this.initHandler();
   }

   public startProcessing(msg?: string) {
      this.element.addClass('jsxc-processing');

      if (msg) {
         let spanElement = this.element.find('.jsxc-js-presence-menu > span');
         spanElement.addClass('jsxc-waiting');

         if (!spanElement.data('previousText')) {
            spanElement.data('previousText', spanElement.text());
         }

         spanElement.text(msg);
      }
   }

   public endProcessing() {
      this.element.removeClass('jsxc-processing');

      let spanElement = this.element.find('.jsxc-js-presence-menu > span');
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

      if (this.rosterItems[contact.getUid()]) {
         return;
      }

      let rosterItem = new RosterItem(contact);

      this.rosterItems[contact.getUid()] = rosterItem;

      this.insert(rosterItem);

      const reinsert = () => {
         let globalRosterItem = this.rosterItems[contact.getUid()];

         if (!globalRosterItem || globalRosterItem !== rosterItem) {
            return;
         }

         rosterItem.detach();

         this.insert(rosterItem);
      };

      contact.registerHook('name', reinsert);
      contact.registerHook('lastMessage', reinsert);
   }

   public remove(contact: IContact) {
      let rosterItem = this.rosterItems[contact.getUid()];

      if (!rosterItem) {
         return;
      }

      delete this.rosterItems[contact.getUid()];

      rosterItem.remove();
   }

   public clearStatus() {
      this.element.find('.jsxc-roster-status').empty();

      this.element.removeClass('jsxc-status-show');
   }

   public setStatus(statusElement: JQuery) {
      this.element.find('.jsxc-roster-status').empty().append(statusElement);

      this.element.addClass('jsxc-status-show');
   }

   public setEmptyContactList() {
      let statusElement = $('<p>');
      statusElement.text(Translation.t('Your_roster_is_empty_add_'));
      statusElement.find('a').click(<any>showContactDialog);
      statusElement.append('.');

      this.setStatus(statusElement);
   }

   public refreshOwnPresenceIndicator() {
      let status = Client.getPresenceController().getStatus();
      let confirmedPresence = Client.getPresenceController().getCurrentPresence();
      let requestedPresence = Client.getPresenceController().getTargetPresence();
      let presence = typeof requestedPresence === 'number' ? requestedPresence : confirmedPresence;

      let htmlStatus = Emoticons.toImage(Utils.escapeHTML(status));
      this.element.find('.jsxc-js-presence-menu .jsxc-bar__caption__secondary').html(htmlStatus);

      let label = $('.jsxc-js-presence-menu .jsxc-' + Presence[presence]).text();
      let labelElement = this.element.find('.jsxc-js-presence-menu .jsxc-bar__caption__primary');

      labelElement.text(label);
      this.element.attr('data-presence', Presence[confirmedPresence]);

      if (requestedPresence === confirmedPresence) {
         labelElement.removeClass('jsxc-waiting');
      } else {
         labelElement.addClass('jsxc-waiting');
      }
   }

   public registerHook(property: string, func: (newValue: any, oldValue: any) => void) {
      Client.getOptions().registerHook(property, func);
   }

   public addNotice(manager: NoticeManager, notice: Notice) {
      let noticeListElement = $('.jsxc-js-notice-menu ul');
      let noticeElement = $('<li/>');

      noticeElement.click(function (ev) {
         ev.stopPropagation();
         ev.preventDefault();

         notice.callFunction();

         manager.removeNotice(notice);
      });

      noticeElement.addClass('jsxc-icon--' + TYPE[notice.getType()].toLowerCase());

      noticeElement.text(notice.getTitle());
      noticeElement.attr('title', notice.getDescription());
      noticeElement.attr('data-notice-id', notice.getId());
      noticeElement.attr('data-manager-id', manager.getId());
      noticeListElement.prepend(noticeElement);

      let numberOfNotices = noticeListElement.find('li').not('.jsxc-js-delete-all').length;
      $('.jsxc-js-notice-menu .jsxc-menu__button').text(numberOfNotices);

      if (numberOfNotices > 2 && noticeListElement.find('.jsxc-js-delete-all').length === 0) {
         let deleteAllElement = $('<li>');
         deleteAllElement.addClass('jsxc-js-delete-all jsxc-menu__item--danger jsxc-icon--delete');
         deleteAllElement.text(Translation.t('Close_all'));
         deleteAllElement.appendTo(noticeListElement);

         deleteAllElement.click(ev => {
            ev.stopPropagation();
            ev.preventDefault();

            let dialog = confirmDialog(Translation.t('Do_you_really_want_to_dismiss_all_notices'));
            dialog
               .getPromise()
               .then(() => {
                  NoticeManager.removeAll();
               })
               .catch(() => {});
         });
      }
   }

   public removeNotice(manager: NoticeManager, noticeId: string) {
      let managerId = manager.getId() || '';
      let noticeElement = $('.jsxc-js-notice-menu li').filter(function () {
         return $(this).attr('data-notice-id') === noticeId && ($(this).attr('data-manager-id') || '') === managerId;
      });

      noticeElement.remove();

      let numberOfNotices = $('.jsxc-js-notice-menu li').not('.jsxc-js-delete-all').length;
      $('.jsxc-js-notice-menu .jsxc-menu__button').text(numberOfNotices > 0 ? numberOfNotices : '');

      if (numberOfNotices < 3) {
         $('.jsxc-js-notice-menu .jsxc-js-delete-all').remove();
      }
   }

   public addMenuEntry(options: {
      id: string;
      handler: (ev: JQuery.ClickEvent<HTMLElement>) => void;
      label: string | JQuery<HTMLElement>;
      icon?: string;
      offlineAvailable?: boolean;
   }) {
      const { id, handler, label, icon, offlineAvailable } = options;
      let li = $('<li>');

      if (!id || !handler || !label) {
         throw new Error('id, handler and label required for menu entry');
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

      ((li, handler) =>
         li.click(ev => {
            let presence = Client.getPresenceController().getCurrentPresence();

            if (presence === Presence.offline && !li.hasClass('jsxc-offline-available')) {
               return;
            }

            return handler(ev);
         }))(li, handler);

      let mainMenu = this.element.find('.jsxc-js-main-menu .jsxc-menu__content ul');
      mainMenu.prepend(li);
   }

   public setFilter(filter: string = '') {
      this.element.find('.jsxc-filter-input').val(filter).trigger('keyup');
   }

   private insert(rosterItem: RosterItem) {
      let contact = rosterItem.getContact();
      let list = contact.isChat() ? this.contactList : this.groupList;
      let contactName = contact.getName();

      let lastMessageDate = contact.getLastMessageDate();
      let pointer = lastMessageDate ? list.find('[data-date]') : list.children().first();
      pointer = pointer.length > 0 ? pointer.first() : list.children().first();

      while (pointer.length > 0) {
         let pointerDate = pointer.data('date') ? new Date(pointer.data('date')) : undefined;
         let pointerName = pointer.find('.jsxc-bar__caption__primary').text();

         if (
            (lastMessageDate && pointerDate && lastMessageDate > pointerDate) ||
            (lastMessageDate && !pointerDate) ||
            (!lastMessageDate && !pointerDate && contactName.localeCompare(pointerName) === -1)
         ) {
            pointer.before(rosterItem.getDom().detach());

            return;
         }

         pointer = pointer.next();
      }

      rosterItem.getDom().appendTo(list);
   }

   private addMainMenuEntries() {
      this.addMenuEntry({
         id: 'about',
         handler: showAboutDialog,
         label: Translation.t('About'),
         offlineAvailable: true,
      });

      let onlineHelpUrl = Client.getOption(HELP_KEY);

      if (onlineHelpUrl) {
         this.addMenuEntry({
            id: 'online-help',
            handler(ev) {
               ev.stopPropagation();

               if (ev.currentTarget === ev.target) {
                  $(ev.target).find('a').get(0).click();
               }
            },
            label: $(
               `<a href="${onlineHelpUrl}" target="_blank" rel="noopener noreferrer">${Translation.t(
                  'Online_help'
               )}</a>`
            ),
            offlineAvailable: true,
            icon: 'help',
         });
      }

      this.addMenuEntry({
         id: 'search-contact',
         handler: showContactSearchDialog,
         label: Translation.t('contact_search'),
         icon: 'search',
      });

      this.addMenuEntry({
         id: 'add-contact',
         handler: () => showContactDialog(),
         label: Translation.t('Add_buddy'),
         icon: 'contact',
      });

      this.addMenuEntry({
         id: 'hide-offline',
         handler: this.toggleOffline,
         label: $(`<span class="jsxc-hide-offline">${Translation.t('Hide_offline')}</span>
                   <span class="jsxc-show-offline">${Translation.t('Show_offline')}</span>`),
      });

      this.addMenuEntry({
         id: 'mute-notification',
         handler: this.toggleMuteNotification,
         label: Translation.t('Mute'),
      });

      this.addMenuEntry({
         id: 'join-muc',
         handler: () => showMultiUserJoinDialog(),
         label: Translation.t('Join_chat'),
         icon: 'groupcontact',
      });

      this.addMenuEntry({
         id: 'settings',
         handler: showSettingsDialog,
         label: Translation.t('Settings'),
         offlineAvailable: true,
         icon: 'gear',
      });

      this.addMenuEntry({
         id: 'add-avatar',
         handler: showAddAvatarDialog,
         label: Translation.t('Edit_avatar'),
      });
   }

   private registerPresenceHandler() {
      this.element.find('.jsxc-js-presence-menu li').click(function () {
         let presenceString = <string>$(this).data('presence');

         if (presenceString === 'extended-status') {
            showSetExStatusDialog();
            return;
         }

         let oldPresence = Client.getPresenceController().getTargetPresence();
         let requestedPresence = Presence[presenceString];

         if (Client.getAccountManager().getAccount()) {
            Client.getPresenceController().setTargetPresence(requestedPresence);
         }

         if (oldPresence === Presence.offline && requestedPresence === Presence.online) {
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

   private toggleOffline = ev => {
      let hideOffline = !Client.getOption(HIDE_OFFLINE_KEY);

      Client.setOption(HIDE_OFFLINE_KEY, hideOffline);
   };

   private hideOffline(yes: boolean) {
      if (yes) {
         this.element.addClass('jsxc-hide-offline');
      } else {
         this.element.removeClass('jsxc-hide-offline');
      }
   }

   private toggleMuteNotification = () => {
      let muteNotification = !Client.getOption('notification.mute');

      Client.setOption('notification.mute', muteNotification);
   };

   private muteNotification(yes: boolean) {
      let element = this.element.find('.jsxc-mute-notification');

      element.text(yes ? Translation.t('Unmute') : Translation.t('Mute'));

      this.element.attr('data-mute', yes ? 'yes' : 'no');
   }

   public toggle = () => {
      let state = Client.getOption(VISIBILITY_KEY);

      state = state === CONST.HIDDEN ? CONST.SHOWN : CONST.HIDDEN;

      Client.setOption(VISIBILITY_KEY, state);
   };

   public hide = () => {
      Client.setOption(VISIBILITY_KEY, CONST.HIDDEN);
   };

   public show = () => {
      Client.setOption(VISIBILITY_KEY, CONST.SHOWN);
   };

   private setVisibility(state: string) {
      if (state === CONST.SHOWN && Client.isExtraSmallDevice()) {
         WindowList.get().minimizeAll();
      }

      $('body').removeClass('jsxc-roster-hidden jsxc-roster-shown');
      $('body').addClass('jsxc-roster-' + state);
   }

   private initOptions() {
      let muteNotification = Client.getOption('notification.mute');
      this.muteNotification(muteNotification);
      Client.getOptions().registerHook('notification', (newValue = {}, oldValue = {}) => {
         if (newValue.mute !== oldValue.mute) {
            this.muteNotification(newValue.mute);
         }
      });

      let hideOffline = Client.getOption(HIDE_OFFLINE_KEY);
      this.hideOffline(hideOffline);
      Client.getOptions().registerHook(HIDE_OFFLINE_KEY, hideOffline => {
         this.hideOffline(hideOffline);
      });

      let visibility = Client.getOption(VISIBILITY_KEY);
      this.setVisibility([CONST.HIDDEN, CONST.SHOWN].indexOf(visibility) > -1 ? visibility : CONST.SHOWN);
      Client.getOptions().registerHook(VISIBILITY_KEY, visibility => {
         this.setVisibility(visibility);
      });

      this.refreshOwnPresenceIndicator();
      Client.getPresenceController().registerTargetPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });
      Client.getPresenceController().registerCurrentPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });

      $('.jsxc-bottom > .jsxc-avatar').on('click', () => {
         if (this.element.attr('data-presence') !== Presence[Presence.offline]) {
            showAddAvatarDialog();
         }
      });
   }

   private initHandler() {
      this.element.find('.jsxc-filter-input').on('keyup', ev => {
         let filterValue = $(ev.target).val().toString().trim().toLowerCase();
         let listElements = this.element.find('.jsxc-contact-list-wrapper .jsxc-roster-item');

         if (!filterValue) {
            listElements.removeClass('jsxc-roster-item--filtered');

            return;
         }

         listElements
            .not(`[data-jid*="${filterValue}"]`)
            .not(`[data-name*="${filterValue}"]`)
            .not(`[data-groups*="${filterValue}"]`)
            .addClass('jsxc-roster-item--filtered');
         listElements.filter(`[data-jid*="${filterValue}"]`).removeClass('jsxc-roster-item--filtered');
         listElements.filter(`[data-name*="${filterValue}"]`).removeClass('jsxc-roster-item--filtered');
         listElements.filter(`[data-groups*="${filterValue}"]`).removeClass('jsxc-roster-item--filtered');
      });

      this.element.find('.jsxc-filter-wrapper .jsxc-clear').on('mousedown', ev => {
         ev.preventDefault();

         this.setFilter('');
      });

      this.element.find('.jsxc-collapsible').on('click', function () {
         $(this).toggleClass('jsxc-active');
      });

      this.element.find('.jsxc-fullscreen-active-conversations-select').on('change', e => {
         let uid = $(e.target).val().toString();
         let contact = this.rosterItems[uid].getContact();
         let chatWindow = contact.getChatWindowController();

         if ($('body').hasClass('jsxc-fullscreen') || Client.isExtraSmallDevice()) {
            Client.getChatWindowList().minimizeAll();
         }

         chatWindow.openProminently();
      });

      setTimeout(() => {
         let select = this.element.find('.jsxc-fullscreen-active-conversations-select');
         if (select.find('option').length === 0) {
            let cwindows = Client.getChatWindowList().getChatWindowIds();
            for (let item of cwindows) {
               let contact = Client.getAccountManager().getAccount().getContact(new JID(item));
               let option = $(
                  `<option data-jid="${
                     contact.getJid().bare
                  }" value="${contact.getUid()}">${contact.getName()}</option>`
               );
               select.append(option);
            }
            select.val(select.find(':first-child').val());
         }
      }, 2000);
   }
}
