import Translation from '../../../../util/Translation';
import MultiUserContact from '../../../../MultiUserContact';
import showSelectionDialog from '../../../../ui/dialogs/selection';
import showRoomConfigurationDialog, { CANCELED } from '../../../../ui/dialogs/multiUserRoomConfiguration';
import { DIRECTION } from '@src/Message.interface';
import { MucSysMessage } from '@ui/dialogs/settings';
import Client from '@src/Client';

export default class MultiUserStatusCodeHandler {
   public static processCodes(codes: string[], multiUserContact: MultiUserContact, nickname?: string) {
      let statusCodeHandler = new MultiUserStatusCodeHandler(multiUserContact, codes.indexOf('110') > -1, nickname);
      let mucSYSMessageMask = Client.getOption('mucSYSMessageMask') || MucSysMessage.NONE;

      for (let code of codes) {
         let msg = statusCodeHandler.processCode(code);

         if (typeof msg === 'string') {
            let addMsg = true;

            switch (parseInt(code, 10)) {
               case 100:
               case 172:
               case 173:
                  addMsg = (mucSYSMessageMask & MucSysMessage.JID) === MucSysMessage.JID ? true : false;
                  break;
               case 170:
                  addMsg = (mucSYSMessageMask & MucSysMessage.LOGGING) === MucSysMessage.LOGGING ? true : false;
                  break;
               case 301:
                  addMsg = (mucSYSMessageMask & MucSysMessage.BAN) === MucSysMessage.BAN ? true : false;
                  break;
               case 307:
               case 321:
               case 322:
                  addMsg = (mucSYSMessageMask & MucSysMessage.KICK) === MucSysMessage.KICK ? true : false;
                  break;

               default:
                  addMsg = (mucSYSMessageMask & MucSysMessage.UNKNOWN) === MucSysMessage.UNKNOWN ? true : false;
                  break;
            }
           
            if (addMsg) {
               let firstmsg = multiUserContact.getTranscript().getFirstMessage();

               if (firstmsg !== undefined && firstmsg.getDirection() === DIRECTION.SYS) {
                  if (firstmsg.getPlaintextMessage() !== msg) {
                     multiUserContact.addSystemMessage(msg);
                  }
               } else {
                  multiUserContact.addSystemMessage(msg);
               }
            }
         }
      }
   }

   constructor(
      private multiUserContact: MultiUserContact,
      private isSelfReferred: boolean,
      private nickname?: string
   ) {}

   public processCode(code: number | string): string | void {
      if (typeof this[code] === 'function') {
         return this[
            code as 100 | 101 | 102 | 103 | 104 | 110 | 170 | 171 | 172 | 173 | 201 | 301 | 307 | 321 | 322 | 332
         ].call(this);
      }
   }

   /** Inform user that any occupant is allowed to see the user's full JID */
   private 100() {
      return Translation.t('Every_member_can_see_your_full_JID');
   }

   /** Inform user that his or her affiliation changed while not in the room */
   private 101() {
      return Translation.t('Your_affiliation_has_changed');
   }

   /** Inform occupants that room now shows unavailable members */
   private 102() {
      return Translation.t('Room_shows_unavailable_members');
   }

   /** Inform occupants that room now does not show unavailable members */
   private 103() {
      return Translation.t('Room_does_not_show_unavailable_members');
   }

   /** Inform occupants that a non-privacy-related room configuration change has occurred */
   private 104() {
      this.multiUserContact.refreshFeatures();

      return Translation.t('Room_configuration_has_changed');
   }

   /** Inform user that presence refers to itself */
   private 110() {
      this.multiUserContact.setMemberListComplete();
   }

   /** Inform occupants that room logging is now enabled */
   private 170() {
      return Translation.t('Room_logging_is_enabled');
   }

   /** Inform occupants that room logging is now disabled */
   private 171() {
      return Translation.t('Room_logging_is_disabled');
   }

   /** Inform occupants that the room is now non-anonymous */
   private 172() {
      this.multiUserContact.refreshFeatures();

      return Translation.t('Room_is_now_non-anoymous');
   }

   /** Inform occupants that the room is now semi-anonymous */
   private 173() {
      this.multiUserContact.refreshFeatures();

      return Translation.t('Room_is_now_semi-anonymous');
   }

   /** Inform user that a new room has been created */
   private 201() {
      let multiUserContact = this.multiUserContact;
      let promise: Promise<Element | unknown>;

      if (multiUserContact.isAutoJoin() && multiUserContact.isInstantRoom()) {
         promise = multiUserContact.createInstantRoom();
      } else if (multiUserContact.isAutoJoin() && multiUserContact.hasRoomConfiguration()) {
         promise = multiUserContact.createPreconfiguredRoom();
      } else {
         promise = showInstantOrConfigurationDialog(multiUserContact);
      }

      promise
         .then(stanza => {
            if (stanza === CANCELED) {
               multiUserContact.addSystemMessage(Translation.t('Configuration_canceled'));
               multiUserContact.getChatWindow().close();
               multiUserContact.getAccount().getContactManager().delete(multiUserContact);
            }
         })
         .catch(() => {});
   }

   /** Inform user that he or she has been banned */
   private 301() {
      if (this.isSelfReferred) {
         return Translation.t('muc_removed_banned');
      }

      return Translation.t('muc_removed_info_banned', {
         nickname: this.nickname,
         escapeInterpolation: true,
      });
   }

   /** Inform user that he or she has been kicked */
   private 307() {
      if (this.isSelfReferred) {
         return Translation.t('muc_removed_kicked');
      }

      return Translation.t('muc_removed_info_kicked', {
         nickname: this.nickname,
         escapeInterpolation: true,
      });
   }

   /** Inform user that he or she is beeing removed from the room because of an affiliation change */
   private 321() {
      if (this.isSelfReferred) {
         return Translation.t('muc_removed_affiliation');
      }

      return Translation.t('muc_removed_info_affiliation', {
         nickname: this.nickname,
         escapeInterpolation: true,
      });
   }

   /**
    * Inform user that he or she is beeing removed from the room because the room has been
    * changed to members-only and the user is not a member
    */
   private 322() {
      if (this.isSelfReferred) {
         return Translation.t('muc_removed_membersonly');
      }

      return Translation.t('muc_removed_info_membersonly', {
         nickname: this.nickname,
         escapeInterpolation: true,
      });
   }

   /**
    * Inform user that he or she is beeing removed from the room because the MUC service
    * is being shut down
    */
   private 332() {
      return Translation.t('muc_removed_shutdown');
   }
}

function showInstantOrConfigurationDialog(multiUserContact: MultiUserContact) {
   return new Promise((resolve, reject) => {
      showSelectionDialog({
         header: Translation.t('Room_creation') + ` (${multiUserContact.getName()})`,
         message: Translation.t('Do_you_want_to_change_the_default_room_configuration'),
         primary: {
            label: Translation.t('Default'),
            cb: () => {
               multiUserContact.setRoomConfiguration(MultiUserContact.INSTANT_ROOMCONFIG);

               let instantRoomPromise = multiUserContact.createInstantRoom();

               resolve(instantRoomPromise);
            },
         },
         option: {
            label: Translation.t('Change'),
            cb: () => {
               let roomConfigurationPromise = showRoomConfigurationDialog(multiUserContact);

               resolve(roomConfigurationPromise);
            },
         },
      });
   });
}
