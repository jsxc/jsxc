import Contact from '../Contact'
import Menu from './util/Menu'
import AvatarSet from './AvatarSet'
import confirmDialog from './dialogs/confirm';
import showVcardDialog from './dialogs/vcard'
import { Presence } from '../connection/AbstractConnection'
import Dialog from './Dialog'
import { IContact } from '../Contact.interface'

let rosterItemTemplate = require('../../template/roster-item.hbs')

export default class RosterItem {
   private element: JQuery;

   constructor(private contact: IContact) {
      let self = this;
      let template = rosterItemTemplate({
         name: contact.getName(),
         lastMessage: contact.getStatus()
      });

      this.element = $(template);
      this.element.attr('data-id', this.contact.getId());
      this.element.attr('data-type', this.contact.getType());
      this.element.attr('data-presence', Presence[this.contact.getPresence()]);
      this.element.attr('data-subscription', this.contact.getSubscription());

      this.element.on('dragstart', (ev) => {
         (<any>ev.originalEvent).dataTransfer.setData('text/plain', contact.getJid().bare);

         $('.jsxc-droppable').addClass('jsxc-dragactive jsxc-drag-rosteritem');
      });

      this.element.on('dragend', () => {
         $('.jsxc-droppable').removeClass('jsxc-dragactive jsxc-drag-rosteritem');
      });

      this.element.click(function() {
         let chatWindow = contact.openChatWindow();

         chatWindow.unminimize();
         chatWindow.highlight();
      });

      this.element.find('.jsxc-rename').click(function(ev) {
         ev.stopPropagation();

         self.rename();
      });

      this.element.find('.jsxc-delete').click(function(ev) {
         ev.stopPropagation();

         //@TODO translation
         confirmDialog('Do you like to delete xyz').getPromise().then((dialog: Dialog) => {
            contact.delete();

            dialog.close();
         }).catch(() => {

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
         this.element.find('.jsxc-name').text(newName);
      });

      this.contact.registerHook('presence', () => {
         this.element.attr('data-presence', Presence[this.contact.getPresence()]);
      });

      this.contact.registerHook('status', (status) => {
         this.element.find('.jsxc-last-msg .jsxc-text').text(status);
      });

      this.contact.registerHook('subscription', () => {
         this.element.attr('data-subscription', this.contact.getSubscription());
      });

      this.contact.getTranscript().registerHook('firstMessageId', (firstMessageId) => {
         if (!firstMessageId) {
            return;
         }

         let message = this.contact.getTranscript().getMessage(firstMessageId);

         this.element.find('.jsxc-subcaption').text(message.getPlaintextMessage());
      });

      let message = this.contact.getTranscript().getFirstMessage();
      if (message) {
         this.element.find('.jsxc-subcaption').text(message.getPlaintextMessage());
      }

      let updateUnreadMessage = () => {
         let unreadMessages = this.contact.getTranscript().getNumberOfUnreadMessages();
         if (unreadMessages > 0) {
            this.element.addClass('jsxc-has-unread-msg');
         } else {
            this.element.removeClass('jsxc-has-unread-msg');
         }
      };

      this.contact.getTranscript().registerHook('unreadMessageIds', updateUnreadMessage);
      updateUnreadMessage();

      // $(document).trigger('add.roster.jsxc', [bid, data, bud]);
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
      let nameElement = this.element.find('.jsxc-name');
      let optionsElement = this.element.find('.jsxc-last-msg, .jsxc-menu');
      let inputElement = $('<input type="text" name="name"/>');

      // hide more menu
      $('body').click();

      inputElement.val(nameElement.text());
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

      optionsElement.hide();
      nameElement.hide();
      nameElement.after(inputElement);

      $('html').one('click', function() {
         self.endRename();
      });
   }

   private endRename() {
      var nameElement = this.element.find('.jsxc-name');
      var optionsElement = this.element.find('.jsxc-last-msg, .jsxc-menu');
      var inputElement = this.element.find('input');

      this.contact.setName(<string>inputElement.val());

      inputElement.remove();
      optionsElement.show();
      nameElement.show();
   }
}
