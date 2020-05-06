import Menu from './util/Menu'
import AvatarSet from './AvatarSet'
import confirmDialog from './dialogs/confirm'
import showVcardDialog from './dialogs/vcard'
import { Presence } from '../connection/AbstractConnection'
import Dialog from './Dialog'
import { IContact } from '../Contact.interface'
import Translation from '../util/Translation'
import Client from '@src/Client';
import Log from '@util/Log'

let rosterItemTemplate = require('../../template/roster-item.hbs')

export default class RosterItem {
   private element: JQuery;

   constructor(private contact: IContact) {
      let self = this;
      let template = rosterItemTemplate({
         jid: contact.getJid().bare,
         name: contact.getName(),
         lastMessage: contact.getStatus()
      });

      this.element = $(template);
      this.element.attr('data-id', this.contact.getId());
      this.element.attr('data-type', this.contact.getType());
      this.element.attr('data-presence', Presence[this.contact.getPresence()]);
      this.element.attr('data-subscription', this.contact.getSubscription());
      this.element.attr('data-date', this.contact.getLastMessageDate()?.toISOString());

      this.element.on('dragstart', (ev) => {
         (<any> ev.originalEvent).dataTransfer.setData('text/plain', contact.getJid().full);

         $('.jsxc-droppable').addClass('jsxc-drag-rosteritem');
      });

      this.element.on('dragend', () => {
         $('.jsxc-droppable').removeClass('jsxc-drag-rosteritem');
      });

      this.element.click(function() {
         let chatWindow = contact.getChatWindowController();

         if ($('body').hasClass('jsxc-fullscreen') || Client.isExtraSmallDevice()) {
            Client.getChatWindowList().minimizeAll();
         }

         chatWindow.openProminently();
      });

      this.element.find('.jsxc-rename').click(function(ev) {
         ev.stopPropagation();

         self.rename();
      });

      this.element.find('.jsxc-delete').click((ev) => {
         ev.stopPropagation();

         let questionString = Translation.t('You_are_about_to_remove_', {
            bid_name: this.contact.getName(),
            bid_jid: this.contact.getJid().bare,
         });
         confirmDialog(questionString, true).getPromise().then((dialog: Dialog) => {
            contact.getAccount().getContactManager().delete(contact);

            //@TODO show spinner

            dialog.close();
         }).catch((err) => {
            Log.warn('Could not delete roster entry', err);
         });
      });

      this.element.find('.jsxc-vcard').click(function(ev) {
         ev.stopPropagation();

         showVcardDialog(self.contact);
      });

      Menu.init(this.element.find('.jsxc-menu'));

      let avatar = AvatarSet.get(this.contact);
      avatar.addElement(this.element.find('.jsxc-avatar'));

      this.contact.registerHook('name', (newName) => {
         this.element.find('.jsxc-bar__caption__primary').text(newName);
      });

      this.contact.registerHook('presence', () => {
         this.element.attr('data-presence', Presence[this.contact.getPresence()]);
      });

      this.contact.registerHook('status', (status) => {
         this.element.find('.jsxc-bar__caption__secondary').text(status);
      });

      this.contact.registerHook('subscription', () => {
         this.element.attr('data-subscription', this.contact.getSubscription());
      });

      this.contact.registerHook('lastMessage', () => {
         this.element.attr('data-date', this.contact.getLastMessageDate()?.toISOString());
      });

      this.contact.getTranscript().registerNewMessageHook((firstMessageId) => {
         if (!firstMessageId) {
            return;
         }

         if (this.contact.getStatus()) {
            return;
         }

         let message = this.contact.getTranscript().getMessage(firstMessageId);

         if (message.isSystem()) {
            return;
         }

         this.element.find('.jsxc-bar__caption__secondary').html(message.getPlaintextEmoticonMessage());
         this.element.find('.jsxc-bar__caption__secondary').attr('title', message.getPlaintextMessage());
      });

      let message = this.contact.getTranscript().getFirstChatMessage();
      if (message) {
         this.element.find('.jsxc-bar__caption__secondary').html(message.getPlaintextEmoticonMessage());
      }

      let updateUnreadMessage = () => {
         let unreadMessages = this.contact.getTranscript().getNumberOfUnreadMessages();
         if (unreadMessages > 0) {
            this.element.addClass('jsxc-bar--has-unread-msg');
         } else {
            this.element.removeClass('jsxc-bar--has-unread-msg');
         }
      };

      this.contact.getTranscript().registerHook('unreadMessageIds', updateUnreadMessage);
      updateUnreadMessage();
   }

   public getDom() {
      return this.element;
   }

   public getContact(): IContact {
      return this.contact;
   }

   public detach() {
      return this.element.detach();
   }

   private rename() {
      let self = this;
      let inputElement = $('<input type="text" name="name"/>');

      // hide more menu
      $('body').click();

      inputElement.addClass('jsxc-grow');
      inputElement.val(this.contact.getName());
      inputElement.keypress(function(ev) {
         if (ev.which !== 13) {
            return;
         }

         self.endRename();

         $('html').off('click');
      });

      // Disable html click event, if click on input
      inputElement.click(function(ev) {
         ev.stopPropagation();
      });

      this.element.find('.jsxc-bar__caption, .jsxc-menu').hide();
      this.element.find('.jsxc-avatar').after(inputElement);

      $('html').one('click', function() {
         self.endRename();
      });
   }

   private endRename() {
      let inputElement = this.element.find('input');

      this.contact.setName(<string> inputElement.val());

      inputElement.remove();
      this.element.find('.jsxc-bar__caption, .jsxc-menu').show();
   }
}
