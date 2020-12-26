import ChatWindow from './ChatWindow'
import MultiUserContact, { AFFILIATION, ROLE } from '../MultiUserContact'
import Translation from '../util/Translation'
import JID from '../JID'
import AvatarSet from './AvatarSet'
import showRoomConfigurationDialog from './dialogs/multiUserRoomConfiguration'
import showMultiUserInviteDialog from './dialogs/multiUserInvite'
import showMucHelp from './dialogs/mucHelpDialog';

enum Command
{
    admin,// change affiliation to admin - also in context menu
    ban,// ban a occupant by setting his affiliation to outcast - also in context menu
    kick,// kick a user by setting its role to none
    clear,// clears the chat history  - calling the clear method of the base class
    deop,// changes role to member
    destroy,// destroy the room
    help,// show this menu
    me,// write in third person style - plugin
    member,// grant membership to occupant
    nick,// change own nickname
    op,// grant moderator privilegs
    owner,// grant owner privilegs
    revoke,// revoke membership
    subject,// set theme of muc room
    topic,// alias for subject
    invite,// invite a user to this room
}

export default class MultiUserChatWindow extends ChatWindow {
   private memberlistElement;

   protected contact: MultiUserContact;

   protected kickedUser : string;

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
             if (oldValue!==this.kickedUser)
             {
                this.disable();
             }
             else
             {
                 this.refreshMemberCount();
             }
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

      this.updatePermissionAttributes(this.contact.getMember(this.contact.getNickname()));   this.element.find('div.jsxc-message-area').on('contextmenu',{ref:this},this.openMUCContextMenu);
   }

   private openMUCContextMenu(event)
   {
        let ref = event.data.ref;
        ref.openContextMenu(event);

        let nick = ref.getContact().data.get('nickname');
        if (!nick)
            nick = ref.getContact().data.get('jid').substring(ref.getContact().data.get('jid').lastIndexOf('/')+1);
        if (!ref.getContact().getMembers().get(nick))
            return;

        let affiliation = ref.getContact().getMembers().get(nick).affiliation;
        let role = ref.getContact().getMembers().get(nick).role;
        let targetnick = $(event.target).closest('div.jsxc-chatmessage').attr('data-name');
        let targetjid = ref.getContact().getMembers().get(targetnick)?ref.getContact().getMembers().get(targetnick).jid:false;
        $(this).closest('.jsxc-window').find('.jsxc-context-menu-contact').text(targetnick);
        if (targetjid&&role==='moderator')
        {
            let liKick = $('<li data-action="jsxc-context-menu-kick" data-target="'+targetnick+'">'+Translation.t('Kick')+'</li>');
            $(this).closest('.jsxc-window').find('.jsxc-custom-menu').append(liKick);

            liKick.on('click',{'ref':ref},function(e)
            {
                let ref = e.data.ref;
                $('.jsxc-custom-menu').hide(100);
                let nick = $(this).attr('data-target');
                ref.kickedUser=nick;
                ref.contact.kick(ref.kickedUser);
                setTimeout(() => ref.scrollMessageAreaToBottom(), 500);
            });
        }

        if (targetjid&&(affiliation==='admin'||affiliation==='owner'))
        {
            let liBan = $('<li data-action="jsxc-context-menu-ban" data-target="'+targetjid+'">'+Translation.t('Ban')+'</li>');
            $(this).closest('.jsxc-window').find('.jsxc-custom-menu').append(liBan);

            liBan.on('click',{'ref':ref},function(e)
            {
                let ref = e.data.ref;
                $('.jsxc-custom-menu').hide(100);
                let jid = $(this).attr('data-target');
                ref.kickedUser=jid;
                ref.contact.ban(new JID(ref.kickedUser));
                setTimeout(() => ref.scrollMessageAreaToBottom(), 500);
            });

            let liOp = $('<li data-action="jsxc-context-menu-op" data-target="'+targetjid+'">'+Translation.t('Op')+'</li>');
            $(this).closest('.jsxc-window').find('.jsxc-custom-menu').append(liOp);

            liOp.on('click',{'ref':ref},function(e)
            {
                let ref = e.data.ref;
                $('.jsxc-custom-menu').hide(100);
                ref.contact.sendChangeRole(targetnick, 'moderator');
                setTimeout(() => ref.scrollMessageAreaToBottom(), 500);
            });

            let liDeop = $('<li data-action="jsxc-context-menu-deop" data-target="'+targetjid+'">'+Translation.t('Deop')+'</li>');
            $(this).closest('.jsxc-window').find('.jsxc-custom-menu').append(liDeop);

            liDeop.on('click',{'ref':ref},function(e)
            {
                let ref = e.data.ref;
                $('.jsxc-custom-menu').hide(100);
                ref.contact.sendChangeRole(targetnick, 'member');
                setTimeout(() => ref.scrollMessageAreaToBottom(), 500);
            });
        }
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

      this.addActionEntry('jsxc-members', this.toggleMemberList, $('<i class="jsxc-icon-group jsxc-icon--center"></i>'));

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

   protected onInputCommand(message)
   {

       let command = message.substring(1,message.indexOf(' ')!==-1?message.indexOf(' '):message.length).toLowerCase();
       if (command === Command[Command.help])
       {
           showMucHelp();
       }
       else
           if (command === Command[Command.subject]||command === Command[Command.topic])
       {
           let parts = message.split(' ');
           parts[0]='';
           this.processCommandSubjectChange(parts.join(' ').trim());
       }
       else
           if (command === Command[Command.clear])
       {
           this.clear();
       }
       else
           if (command === Command[Command.invite])
       {
           this.processCommandInvite(message);
       }
       else
           if (command === Command[Command.ban])
       {
           this.processCommandKickBan(message,false);
       }
       else
           if (command === Command[Command.kick])
       {
           this.processCommandKickBan(message,true);
       }
       else
           if (command === Command[Command.admin])
       {
           this.processCommandAffiliation(message,'admin');
       }
       else
           if (command === Command[Command.op])
       {
           this.processCommandRole(message,'moderator');
       }
       else
           if (command === Command[Command.deop])
       {
           this.processCommandRole(message,'participant');
       }
       else
           if (command === Command[Command.nick])
       {
           let parts = message.split(' ');
           if (parts.length===2)
           {
                this.contact.setNewNickname(parts[1]);
           }
       }
       else
           if (command === Command[Command.me])
       {
           console.error('should never be happen because of if clause before function call...');
       }
       else
           if (command === Command[Command.destroy])
       {
           this.contact.destroy();
       }
       else
           if (command === Command[Command.member])
       {
           this.processCommandAffiliation(message,'member');
       }
       else
           if (command === Command[Command.owner])
       {
           this.processCommandAffiliation(message,'owner');
       }
       else
           if (command === Command[Command.revoke])
       {
           this.processCommandAffiliation(message,'none');
       }
       else
       {
           console.error('UNKNOWN COMMAND, IGNORE...');
       }
   }

    private processCommandRole(message: string, role: string)
   {
       let parts = message.split(' ');
       if (parts.length===2)
       {
           this.contact.sendChangeRole(parts[1], role);
       }
   }

   private processCommandAffiliation(message: string, affiliation: string)
   {
       let parts = message.split(' ');
       if (parts.length===2)
       {
           this.contact.sendChangeAffiliation(new JID(parts[1]), affiliation);
       }
   }

   private processCommandKickBan(message, onlykick: Boolean)
   {
       let parts = message.split(' ');
       if (parts.length===2)
       {
           this.kickedUser=parts[1];
           if (onlykick)
           {
               this.contact.kick(this.kickedUser);
           }
           else
           {
               this.contact.ban(new JID(this.kickedUser));
           }
       }
       else
       if (parts.length>2)
       {
           this.kickedUser=parts[1];
           parts[0]='';
           parts[1]='';
           let reason = parts.join(' ').trim();
           if (onlykick)
           {
               this.contact.kick(this.kickedUser,reason);
           }
           else
           {
               this.contact.ban(new JID(this.kickedUser),reason);
           }
       }
       else
       {
           this.kickedUser=null;
       }
   }

   private processCommandSubjectChange(subject)
   {
       this.contact.setTopic(subject);
   }

   private processCommandInvite(message)
   {
       let parts = message.split('\\s');
       if (parts.length>1&&parts.length<4)
       {
           let reason='';
           let jid = new JID(parts[1]);
           if (parts.length===3)
           {
               reason = parts[2];
           }
           this.contact.invite(jid, reason);
       }
       else
           console.error('Wrong syntax for invite command');
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
