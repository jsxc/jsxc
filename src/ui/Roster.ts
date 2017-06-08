import Options from '../Options'
import Templates from '../util/Templates'
import showSettings from './dialogs/settings'
import showContactDialog from './dialogs/contact'
import showAboutDialog from './dialogs/about'
import * as CONST from '../CONST'
import RosterItem from './RosterItem'
import showLoginBox from './dialogs/loginBox'
import Menu from './util/Menu'
import Contact from '../Contact'
import WindowList from './ChatWindowList'
import Client from '../Client'
import Storage from '../Storage'
import PersistentMap from '../PersistentMap'
import Translation from '../util/Translation'
//import rosterTemplate from '../../template/roster.hbs'
let rosterTemplate = require('../../template/roster.hbs')

//@TODO duplicate of AbstractConnection
enum Status {
   online,
   chat,
   away,
   xa,
   dnd,
   offline
}

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

      this.hideOffline(Options.get('hideOffline'));

      this.storage = Client.getStorage();
      this.options = new PersistentMap(this.storage, 'roster');

      this.registerMainMenuHandler();
      this.registerPresenceHandler();
      this.registerToggleHandler();

      Menu.init(this.element.find('.jsxc-menu'));

      let rosterState = this.options.get('visibility') || (Options.get('loginForm').startMinimized ? CONST.HIDDEN : CONST.SHOWN);
      this.setVisibility(rosterState);
      this.options.registerHook('visibility', (visibility) => {
         this.setVisibility(visibility);
      });

      let presence = this.options.get('presence') || Status.offline;
      this.setPresence(presence);
      this.options.registerHook('presence', (presence) => {
         this.setPresence(presence);
      });

      // jsxc.notice.load();
   }

   public add(contact:Contact) {
      this.clearStatus();

      if (this.element.find('.jsxc-roster-item[data-id="'+contact.getId()+'"]').length > 0) {
         return;
      }

      let rosterItem = new RosterItem(contact);
      this.insert(rosterItem);
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
      linkElement.click(showLoginBox);

      let statusElement = $('<p>');
      statusElement.text('no_connection');
      statusElement.append(linkElement);

      this.setStatus(statusElement);
   }

   public setEmptyContactList() {
      let statusElement = $('<p>');
      statusElement.text(Translation.t('Your_roster_is_empty_add_'));
      statusElement.find('a').click(showContactDialog);
      statusElement.append('.');

      this.setStatus(statusElement);
   }

   public setPresence(presence:Status) {
      let label = $('.jsxc-menu-presence .jsxc-' + Status[presence]).text();

      $('.jsxc-menu-presence > span').text(label);
   }

   private insert(rosterItem:RosterItem) {
      let contactList = this.contactList;
      let insert = false;
      let contact = rosterItem.getContact();

      // Insert buddy with no mutual friendship to the end
      let status = (contact.getSubscription() === 'both') ? contact.getPresence() : -1;

      contactList.children().each(function() {
         var pointer = $(this);
         var pointerSubscription = pointer.data('subscription');
         var pointerStatus = (pointerSubscription === 'both') ? pointer.data('presence') : -1;
         let pointerName = pointer.find('.jsxc-name').text();

         if ((pointerName.toLowerCase() > contact.getName().toLowerCase() && pointerStatus === status) || pointerStatus < status) {

            pointer.before(rosterItem.getDom());
            insert = true;

            return false;
         }
      });

      if (!insert) {
         rosterItem.getDom().appendTo(contactList);
      }
   }

   private registerMainMenuHandler() {
      let mainMenu = this.element.find('.jsxc-menu-main');

      mainMenu.find('.jsxc-settings').click(showSettings);

      mainMenu.find('.jsxc-hide-offline').click(this.toggleOffline);

      mainMenu.find('.jsxc-mute-notification').click(this.muteNotification);

      mainMenu.find('.jsxc-add-contact').click(showContactDialog);

      mainMenu.find('.jsxc-about').click(showAboutDialog);
   }

   private registerPresenceHandler() {
      let options = this.options;

      this.element.find('.jsxc-menu-presence li').click(function() {
         let presence = $(this).data('presence');

         options.set('presence', Status[presence]);

         Client.getAccout().getConnection().sendPresence(Status[presence]);
      });
   }

   private registerToggleHandler() {
      this.element.find('.jsxc-roster-toggle').click(this.toggle);
   }

   private toggleOffline() {
      var hideOffline = !Options.get('hideOffline');

      this.hideOffline(hideOffline);

      Options.set('hideOffline', hideOffline);
   }

   private hideOffline(yes:boolean) {
      if (yes) {
         this.contactList.addClass('jsxc-hideOffline');
      } else {
         this.contactList.removeClass('jsxc-hideOffline');
      }
   }

   private muteNotification() {

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
}
