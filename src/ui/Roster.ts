import showContactDialog from './dialogs/contact'
import showContactSearchDialog from './dialogs/contactsearch'
import showAboutDialog from './dialogs/about'
import showMultiUserJoinDialog from './dialogs/multiUserJoin'
import showSettingsDialog from './dialogs/settings'
import showSetPEPAvatarDialog from './dialogs/pepavatar'
import * as CONST from '../CONST'
import RosterItem from './RosterItem'
import Menu from './util/Menu'
import { IContact } from '../Contact.interface'
import WindowList from './ChatWindowList'
import Client from '../Client'
import Translation from '../util/Translation'
import { Notice, TYPE } from '../Notice'
import { Presence } from '../connection/AbstractConnection'
import { NoticeManager } from '../NoticeManager'
import ClientAvatar from '../ClientAvatar'
import confirmDialog from './dialogs/confirm'

let rosterTemplate = require('../../template/roster.hbs')

const APPEND_KEY = 'rosterAppend';
const VISIBILITY_KEY = 'rosterVisibility';
const HELP_KEY = 'onlineHelp';
const HIDE_OFFLINE_KEY = 'hideOfflineContacts';

export default class Roster {

   private element: JQuery;
   private contactList: JQuery;
   private groupList: JQuery;

   private static instance: Roster;

   public static init(): void {
      Roster.get();
   }
  
  
   public static get(): Roster {
      if (!Roster.instance) {
         Roster.instance = new Roster();

         Client.getNoticeManager();
      }
     
     Roster.instance.addContactFilter();     

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
   
   private initCollapisible()
   {
       var coll = $(".jsxc-collapsible");
      var i;

      for (i = 0; i < coll.length; i++) 
      {
          $(coll[i]).off("click").on("click", function() 
         {
            this.classList.toggle("jsxc-active");
            var content = $(this).next();
            if ($(content)[0].style.maxHeight){
              $(content)[0].style.maxHeight = null;
              $(content)[0].style.display="none";
            } else {
               $(content)[0].style.display="";
                $(content)[0].style.maxHeight = $(content)[0].scrollHeight + "px";             
            }             
          });
      }
      
      if (this.contactList[0].style.maxHeight){
        this.contactList[0].style.maxHeight = null;
        this.contactList[0].style.display="none";
      } else {
         if (this.contactList[0].childNodes.length>0)
         {
            this.contactList[0].style.display="";
            this.contactList[0].style.maxHeight = this.contactList[0].scrollHeight + "px";            
         }
      } 
   }
   
   private addContactFilter()
   {
      $("#filterlist").off("keyup").on("keyup",function(e)
      {
         $.each( $(".jsxc-contact-list").children("li"), function( key, value )
         {
             $(this).css({"display":""});
         });
         $.each( $(".jsxc-group-list").children("li"), function( key, value )
         {
             $(this).css({"display":""});
         });
         
         var val = null;
         
         if ($(this).val())
            val = new String($(this).val());
         
         if (val!=null&&val.length>0)
         {         
            val=val.toLowerCase();
            $.each( $(".jsxc-contact-list").children("li"), function( key, value )
            {
               var text = $(this).children("div.jsxc-bar__caption.jsxc-grow").text().trim().toLowerCase();
               if (text.indexOf(val)==-1&&$(this).attr("data-id").substring(0,$(this).attr("data-id").indexOf("@")).toLowerCase().indexOf(val)==-1)
               {
                  $(this).css({"display":"none"});
               }
            });
            $.each( $(".jsxc-group-list").children("li"), function( key, value )
            {
               var text = $(this).children("div.jsxc-bar__caption.jsxc-grow").text().trim().toLowerCase();
               if (text.indexOf(val)==-1&&$(this).attr("data-id").substring(0,$(this).attr("data-id").indexOf("@")).toLowerCase().indexOf(val)==-1)
               {
                  $(this).css({"display":"none"});
               }
            });
         }
         
      });
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

      if (this.element.find('.jsxc-roster-item[data-id="' + contact.getId() + '"]').length > 0) {
         return;
      }

      let rosterItem = new RosterItem(contact);
      this.insert(rosterItem);

      contact.registerHook('name', () => {
         rosterItem.getDom().detach();

         this.insert(rosterItem);
      });

      contact.registerHook('lastMessage', () => {
         rosterItem.getDom().detach();

         this.insert(rosterItem);
      });
    
      let contactType = contact.getType();
      let list = contactType=="chat"?this.contactList:this.groupList;
          
      if (!$($(list).parent()[0]).prev().hasClass("jsxc-active"))
      {
         $(list).parent()[0].style.maxHeight = null;
          $(list).parent()[0].style.display="none";
      }
      else 
      {
          if ($($(list).parent()[0]).prev().hasClass("jsxc-active"))
          {
              $(list).parent()[0].style.display="";
              $(list).parent()[0].style.maxHeight = $(list).parent()[0].scrollHeight + "px";         
          }
     } 
   }

   public remove(contact: IContact) {
      let rosterItemElement = this.element.find('.jsxc-roster-item[data-id="' + contact.getId() + '"]');

      if (rosterItemElement.length === 0) {
         return;
      }

      rosterItemElement.remove();

      let contactType = contact.getType();
      let list = contactType=="chat"?this.contactList:this.groupList;
          
      if (!$($(list).parent()[0]).prev().hasClass("jsxc-active"))
      {
         $(list).parent()[0].style.maxHeight = null;
          $(list).parent()[0].style.display="none";
      }
      else 
      {
          if ($($(list).parent()[0]).prev().hasClass("jsxc-active"))
          {
              $(list).parent()[0].style.display="";
              $(list).parent()[0].style.maxHeight = $(list).parent()[0].scrollHeight + "px";         
          }
      } 
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
      statusElement.find('a').click(<any> showContactDialog);
      statusElement.append('.');

      this.setStatus(statusElement);
   }

   public refreshOwnPresenceIndicator() {
      let confirmedPresence = Client.getPresenceController().getCurrentPresence();
      let requestedPresence = Client.getPresenceController().getTargetPresence();
      let presence = typeof requestedPresence === 'number' ? requestedPresence : confirmedPresence;

      let label = $('.jsxc-js-presence-menu .jsxc-' + Presence[presence]).text();
      let labelElement = this.element.find('.jsxc-js-presence-menu .jsxc-menu__button');

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

      noticeElement.click(function(ev) {
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
      noticeListElement.append(noticeElement);

      let numberOfNotices = noticeListElement.find('li').not('.jsxc-js-delete-all').length;
      $('.jsxc-js-notice-menu .jsxc-menu__button').text(numberOfNotices);

      if (numberOfNotices > 2 && noticeListElement.find('.jsxc-js-delete-all').length === 0) {
         let deleteAllElement = $('<li>');
         deleteAllElement.addClass('jsxc-js-delete-all jsxc-menu__item--danger jsxc-icon--delete');
         deleteAllElement.text(Translation.t('Close_all'));
         deleteAllElement.prependTo(noticeListElement);

         deleteAllElement.click((ev) => {
            ev.stopPropagation();
            ev.preventDefault();

            let dialog = confirmDialog(Translation.t('Do_you_really_want_to_dismiss_all_notices'));
            dialog.getPromise().then(() => {
               NoticeManager.removeAll();
            }).catch(() => {});
         });
      }
   }

   public removeNotice(manager: NoticeManager, noticeId: string) {
      let managerId = manager.getId() || '';
      let noticeElement = $('.jsxc-js-notice-menu li').filter(function() {
         return $(this).attr('data-notice-id') === noticeId &&
            ($(this).attr('data-manager-id') || '') === managerId;
      });

      noticeElement.remove();

      let numberOfNotices = $('.jsxc-js-notice-menu li').not('.jsxc-js-delete-all').length;
      $('.jsxc-js-notice-menu .jsxc-menu__button').text(numberOfNotices > 0 ? numberOfNotices : '');

      if (numberOfNotices < 3) {
         $('.jsxc-js-notice-menu .jsxc-js-delete-all').remove();
      }
   }

   public addMenuEntry(options: { id: string, handler: (ev) => void, label: string | JQuery<HTMLElement>, icon?: string, offlineAvailable?: boolean }) {
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

      ((li, handler) => li.click(ev => {
         let presence = Client.getPresenceController().getCurrentPresence();

         if (presence === Presence.offline && !li.hasClass('jsxc-offline-available')) {
            return;
         }

         return handler(ev);
      }))(li, handler);

      let mainMenu = this.element.find('.jsxc-js-main-menu .jsxc-menu__content ul');
      mainMenu.prepend(li);
   }

   private insert(rosterItem: RosterItem) {
     let contact = rosterItem.getContact();
     let contactType = contact.getType();
      let list = contactType=="chat"?this.contactList:this.groupList;
      
      let contactName = contact.getName();

      let lastMessageDate = contact.getLastMessageDate();

      let pointer = lastMessageDate ? list.find('[data-date]') : list.children().first();
      pointer = pointer.length > 0 ? pointer.first() : list.children().first();

      while (pointer.length > 0) {
         let pointerDate = pointer.data('date') ? new Date(pointer.data('date')) : undefined;
         let pointerName = pointer.find('.jsxc-bar__caption__primary').text();

         if ((lastMessageDate && pointerDate && lastMessageDate > pointerDate) ||
            (lastMessageDate && !pointerDate) ||
            (!lastMessageDate && !pointerDate && contactName.localeCompare(pointerName) === -1)) {

            pointer.before(rosterItem.getDom().detach());

            return;
         }

         pointer = pointer.next();
      }

      rosterItem.getDom().appendTo(list);
    
     if (!$($(list).parent()[0]).prev().hasClass("jsxc-active"))
     {
        $(list).parent()[0].style.maxHeight = null;
        $(list).parent()[0].style.display="none";
     }
     else 
     {
        if ($($(list).parent()[0]).prev().hasClass("jsxc-active"))
        {
          $(list).parent()[0].style.display="";
          $(list).parent()[0].style.maxHeight = $(list).parent()[0].scrollHeight + "px";          
        }
     } 
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
               let win = window.open(onlineHelpUrl, '_blank');
               win.focus();
            },
            label: $(`<a href="${onlineHelpUrl}">${Translation.t('Online_help')}</a>`),
            offlineAvailable: true,
            icon: 'help',
         });
      }

      this.addMenuEntry({
         id: 'search-contact',
         handler: showContactSearchDialog,
         label: Translation.t('contact_search'),
         icon: 'search'
      });

      this.addMenuEntry({
         id: 'add-contact',
         handler: showContactDialog,
         label: Translation.t('Add_buddy'),
         icon: 'contact'
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
         handler: showMultiUserJoinDialog,
         label: Translation.t('Join_chat'),
         icon: 'groupcontact'
      });

      this.addMenuEntry({
         id: 'settings',
         handler: showSettingsDialog,
         label: Translation.t('Settings'),
         offlineAvailable: true,
         icon: 'gear'
      });

	  this.addMenuEntry({
         id: 'set-pepavatar',
         handler: showSetPEPAvatarDialog,
         label: Translation.t('Add_PEPAvatar'),
      });
   }

   private registerPresenceHandler() {
      this.element.find('.jsxc-js-presence-menu li').click(function() {
         let presenceString = <string> $(this).data('presence');
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
/*
         if (oldPresence !== Presence.offline && requestedPresence === Presence.offline) {
             let labelElement = $('.jsxc-js-presence-menu .jsxc-menu__button');
             labelElement.removeClass('jsxc-waiting');
		 }*/
      });
   }

   private registerToggleHandler() {
      this.element.find('.jsxc-roster-toggle').click(this.toggle);
   }

   private toggleOffline = (ev) => {
      let hideOffline = !Client.getOption(HIDE_OFFLINE_KEY);

      Client.setOption(HIDE_OFFLINE_KEY, hideOffline);
   }

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
   }

   private muteNotification(yes: boolean) {
      let element = this.element.find('.jsxc-mute-notification');

      element.text(yes ? Translation.t('Unmute') : Translation.t('Mute'));

      this.element.attr('data-mute', yes ? 'yes' : 'no');
   }

   public toggle = () => {
      let state = Client.getOption(VISIBILITY_KEY);

      state = (state === CONST.HIDDEN) ? CONST.SHOWN : CONST.HIDDEN;

      Client.setOption(VISIBILITY_KEY, state);
   }

   public hide = () => {
      Client.setOption(VISIBILITY_KEY, CONST.HIDDEN);
   }

   public show = () => {
      Client.setOption(VISIBILITY_KEY, CONST.SHOWN);
   }

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
      Client.getOptions().registerHook(HIDE_OFFLINE_KEY, (hideOffline) => {
         this.hideOffline(hideOffline);
      });

      let visibility = Client.getOption(VISIBILITY_KEY);
      this.setVisibility([CONST.HIDDEN, CONST.SHOWN].indexOf(visibility) > -1 ? visibility : CONST.SHOWN);
      Client.getOptions().registerHook(VISIBILITY_KEY, (visibility) => {
         this.setVisibility(visibility);
      });

      this.refreshOwnPresenceIndicator();
      Client.getPresenceController().registerTargetPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });
      Client.getPresenceController().registerCurrentPresenceHook(() => {
         this.refreshOwnPresenceIndicator();
      });
     
     this.initCollapisible();
   }
}
