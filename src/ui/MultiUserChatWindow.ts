import ChatWindow from './ChatWindow'
import MultiUserContact, { AFFILIATION, ROLE } from '../MultiUserContact'
import Translation from '../util/Translation'
import JID from '../JID'
import AvatarSet from './AvatarSet'
import showRoomConfigurationDialog from './dialogs/multiUserRoomConfiguration'
import showMultiUserInviteDialog from './dialogs/multiUserInvite'

export default class MultiUserChatWindow extends ChatWindow {
   private memberlistElement;

   protected contact: MultiUserContact;

   constructor(contact: MultiUserContact) {
      super(contact);

      this.disable();
      this.element.addClass('jsxc-groupchat');

      this.addMucElementsToChatWindow();

      this.contact.registerNewMemberHook((value, nickname) => {
         this.addMember(nickname);
      });

      this.contact.registerRemoveMemberHook((nickname) => {
         this.removeMember(nickname);
      });

      for (let nickname of this.contact.getMemberIds()) {
         this.addMember(nickname);
      }

      this.contact.registerHook('nickname', (newValue, oldValue) => {
         if (oldValue && !newValue) {
            this.disable();
         } else if (!oldValue && newValue) {
            this.enable();
         }
      });

      this.contact.getNickname() ? this.enable() : this.disable();

      this.contact.registerHook('subject', (newSubject) => {
         this.setBarText(newSubject);
      });
      this.setBarText(this.contact.getSubject());

      this.contact.registerMemberHook(this.contact.getNickname(), (data) => {
         this.updatePermissionAttributes(data);
      });
      this.updatePermissionAttributes(this.contact.getMember(this.contact.getNickname()));
   }

   private updatePermissionAttributes(data: {affiliation?: AFFILIATION, role?: ROLE, jid?: JID} = {}) {
      this.getDom().attr('data-role', data.role);
      this.getDom().attr('data-affiliation', data.affiliation);
   }

   public addMember(nickname: string) {
      let memberElement = this.getMemberElementByNickname(nickname);

      if (memberElement.length > 0) {
         return;
      }

      let { jid, affiliation, role } = this.contact.getMember(nickname);

      memberElement = $('<li><div class="jsxc-avatar"></div><div class="jsxc-name"/></li>');
      memberElement.attr('data-nickname', nickname);
      memberElement.attr('data-affiliation', affiliation);
      memberElement.attr('data-role', role);

      this.memberlistElement.find('ul').append(memberElement);

      let title: string;
      let label: string;
      let avatarElement = memberElement.find('.jsxc-avatar');

      if (jid) {
         label = `${nickname} (${jid.bare})`;
         title = nickname + '\n' + jid.bare;

         let contact = this.getAccount().getContact(jid);

         if (contact) {
            AvatarSet.get(contact).addElement(avatarElement);
         } else {
            AvatarSet.setPlaceholder(avatarElement, nickname);
         }
      } else {
         label = title = nickname;

         AvatarSet.setPlaceholder(avatarElement, nickname);
      }

      if (nickname === this.contact.getNickname()) {
         label = `${nickname} (${Translation.t('you')})`;
      }

      memberElement.find('.jsxc-name').text(label);
      memberElement.attr('title', title);

      this.refreshMemberCount();
   }

   public removeMember(nickname: string) {
      let m = this.memberlistElement.find('li[data-nickname="' + nickname + '"]');

      if (m.length > 0) {
         m.remove();
      }

      this.refreshMemberCount();
   }

   public emptyMemberList(room) {
      this.memberlistElement.empty();
   }

   private refreshMemberCount() {
      this.element.find('.jsxc-members').attr('data-number-of-members', this.memberlistElement.find('li').length || '');
   }

   protected initDroppable() {
      super.initDroppable();

      let windowElement = this.element.find('.jsxc-window');

      windowElement.on('drop', (ev) => {
         if ((<any> ev.originalEvent).dataTransfer.files.length) {
            return;
         }

         ev.preventDefault();

         let jid = new JID((<any> ev.originalEvent).dataTransfer.getData('text'));

         this.contact.invite(jid);
      });
   }

   private addMucElementsToChatWindow() {
      this.addMemberList();

      this.addActionEntry('jsxc-members', this.toggleMemberList);

      this.addMenuEntry(
         'jsxc-destroy',
         Translation.t('Destroy'),
         () => {
            this.contact.destroy();
         }
      );

      this.addMenuEntry(
         'jsxc-configure',
         Translation.t('Configure'),
         () => {
            showRoomConfigurationDialog(this.contact);
         }
      );

      this.addMenuEntry(
         'jsxc-leave',
         Translation.t('Leave'),
         () => {
            this.contact.leave();
         }
      );

      this.addMenuEntry(
         'jsxc-invite',
         Translation.t('Invite'),
         () => {
            showMultiUserInviteDialog(this.contact);
         }
      )
   }

   private addMemberList() {
      this.memberlistElement = $('<div class="jsxc-memberlist"><ul></ul></div>');
      this.element.find('.jsxc-window-fade').prepend(this.memberlistElement);
   }

   private toggleMemberList = (ev) => {
      if (ev) {
         ev.preventDefault();
      }

      let ul = this.memberlistElement.find('ul:first');

      this.memberlistElement.toggleClass('jsxc-expand');

      if (this.memberlistElement.hasClass('jsxc-expand')) {
         $('body').click();
         $('body').one('click', this.toggleMemberList);

         ul.mouseleave(function() {
            ul.data('timer', window.setTimeout(this.toggleMemberList, 2000));
         }).mouseenter(function() {
            window.clearTimeout(ul.data('timer'));
         });
      } else {
         window.clearTimeout(ul.data('timer'));
         $('body').off('click', null, this.toggleMemberList);
         ul.off('mouseleave mouseenter');
      }

      return false;
   }

   private getMemberElementByNickname(nickname: string) {
      return this.memberlistElement.find('.li[data-nickname="' + nickname + '"]');
   }

   private enable() {
      this.element.removeClass('jsxc-disabled');
   }

   private disable() {
      this.element.addClass('jsxc-disabled');
   }
}
