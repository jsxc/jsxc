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
import {ContactInterface} from '../ContactInterface'
import WindowList from './ChatWindowList'
import Client from '../Client'
import Storage from '../Storage'
import PersistentMap from '../util/PersistentMap'
import Account from '../Account'
import Translation from '../util/Translation'
import Avatar from './Avatar'
import {Notice} from '../Notice'
import {Presence} from '../connection/AbstractConnection'
import {NoticeManager} from '../NoticeManager'
//import rosterTemplate from '../../template/roster.hbs'
let rosterTemplate = require('../../template/roster.hbs')

export default class Roster {

   private element:JQuery;
   private contactList:JQuery;
   private storage:Storage;
   private options:PersistentMap;

   private static instance:Roster;

   public static init():void {
      Roster.get();
   }

   public static get():Roster {
      if (!Roster.instance) {
         Roster.instance = new Roster();
      }

      return Roster.instance;
   }

   public constructor() {
      let template = rosterTemplate({
         onlineHelpUrl: Options.get('onlineHelp')
      });
      this.element = $(template);
      this.element.appendTo(Options.get('rosterAppend') + ':first');

      this.contactList = this.element.find('.jsxc-contact-list');

      this.storage = Client.getStorage();
      this.options = new PersistentMap(this.storage, 'roster');

      this.registerMainMenuHandler();
      this.registerPresenceHandler();
      this.registerToggleHandler();

      Menu.init(this.element.find('.jsxc-menu'));

      this.initOptions();
   }

   public setRosterAvatar(contact:ContactInterface) {
      let avatar = Avatar.get(contact);
      avatar.addElement(this.element.find('.jsxc-bottom .jsxc-avatar'));
   }

   public add(contact:ContactInterface) {
      this.clearStatus();

      if (this.element.find('.jsxc-roster-item[data-id="'+contact.getId()+'"]').length > 0) {
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

   public remove(contact:ContactInterface) {
      let rosterItemElement = this.element.find('.jsxc-roster-item[data-id="'+contact.getId()+'"]');

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

   public setStatus(statusElement:JQuery) {
      this.element.find('.jsxc-roster-status').empty().append(statusElement);

      this.element.addClass('jsxc-status-show');
   }

   public setNoConnection() {
      let linkElement = $('<a>');
      linkElement.text('relogin');
      linkElement.click(<any> showLoginBox);

      let statusElement = $('<p>');
      statusElement.text('no_connection');
      statusElement.append(linkElement);

      this.setStatus(statusElement);
   }

   public setEmptyContactList() {
      let statusElement = $('<p>');
      statusElement.text(Translation.t('Your_roster_is_empty_add_'));
      statusElement.find('a').click(<any> showContactDialog);
      statusElement.append('.');

      this.setStatus(statusElement);
   }

   public setPresence(presence:Presence) {
      this.options.set('presence', presence);
   }

   public refreshOwnPresenceIndicator() {
      let presence = this.options.get('presence');

      this.updateOwnPresenceIndicator(presence);
   }

   public registerHook(property:string, func:(newValue:any, oldValue:any)=>void) {
      this.options.registerHook(property, func);
   }

   public addNotice(manager:NoticeManager, notice:Notice) {
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

   public removeNotice(manager:NoticeManager, noticeId:string) {
      let noticeElement = $('#jsxc-notice li').filter(function() {
         return $(this).attr('data-notice-id') === noticeId &&
            $(this).attr('data-manager-id') === manager.getId();
      });

      noticeElement.remove();

      let numberOfNotices = $('#jsxc-notice li').length;
      $('#jsxc-notice > span').text(numberOfNotices > 0 ? numberOfNotices : '');
   }

   private insert(rosterItem:RosterItem) {
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

   private updateOwnPresenceIndicator(presence:Presence) {
      let label = $('.jsxc-menu-presence .jsxc-' + Presence[presence]).text();

      $('.jsxc-menu-presence > span').text(label);
   }

   private registerMainMenuHandler() {
      let mainMenu = this.element.find('.jsxc-menu-main');

      mainMenu.find('li.jsxc-settings').click(showSettings);

      mainMenu.find('li.jsxc-join-muc').click(showMultiUserJoinDialog);

      mainMenu.find('li.jsxc-hide-offline').click(this.toggleOffline);

      mainMenu.find('li.jsxc-mute-notification').click(this.muteNotification);

      mainMenu.find('li.jsxc-add-contact').click(<any> showContactDialog);

      mainMenu.find('li.jsxc-about').click(showAboutDialog);
   }

   private registerPresenceHandler() {
      let options = this.options;

      this.element.find('.jsxc-menu-presence li').click(function() {
         let presence = $(this).data('presence');

         options.set('presence', Presence[presence]);

         if (presence !== Presence.offline) {
            // offline presence needs special handling in XMPPConnection
            Client.getAccount().getConnection().sendPresence(<any> Presence[presence]);
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

   private hideOffline(yes:boolean) {
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

   private setVisibility(state:string) {
      if (state === CONST.SHOWN && Client.isExtraSmallDevice()) {
         WindowList.get().minimizeAll();
      }

      $('body').removeClass('jsxc-roster-hidden jsxc-roster-shown');
      $('body').addClass('jsxc-roster-' + state);

      // @REVIEW via storage hook?
      // let duration = parseFloat(this.element.css('transitionDuration') || '0') * 1000;
      //
      // setTimeout(function() {
      //    jsxc.gui.updateWindowListSB();
      // }, duration);
   }

   private initOptions() {
      let hideOffline = this.options.get('hideOffline');console.log('hideOffline', hideOffline, typeof hideOffline)
      hideOffline = (typeof hideOffline === 'boolean') ? hideOffline : Options.get('hideOffline');
      this.hideOffline(hideOffline);
      this.options.registerHook('hideOffline', (hideOffline) => {
         this.hideOffline(hideOffline);
      });

      let rosterState = this.options.get('visibility') || (Options.get('loginForm').startMinimized ? CONST.HIDDEN : CONST.SHOWN);
      this.setVisibility(rosterState);
      this.options.registerHook('visibility', (visibility) => {
         this.setVisibility(visibility);
      });

      let presence = this.options.get('presence');
      presence = typeof presence === 'number' ? presence : Presence.offline;
      this.updateOwnPresenceIndicator(presence);
      this.options.registerHook('presence', (presence) => {
         this.updateOwnPresenceIndicator(presence);
      });
   }
}
