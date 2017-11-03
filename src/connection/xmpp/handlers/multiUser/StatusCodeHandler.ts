import Translation from '../../../../util/Translation'
import Log from '../../../../util/Log'
import JID from '../../../../JID'
import MultiUserContact from '../../../../MultiUserContact'
import MultiUserPresenceProcessor from './PresenceProcessor'
import showSelectionDialog from '../../../../ui/dialogs/selection'
import showRoomConfigurationDialog from '../../../../ui/dialogs/multiUserRoomConfiguration'

//@TODO those status codes are partially transmitted through message stanzas
// https://xmpp.org/extensions/xep-0045.html#registrar-statuscodes

export default class MultiUserStatusCodeHandler {
   constructor(private presenceHandler: MultiUserPresenceProcessor, private isSelfRefered: boolean) {

   }

   public processCode(code): string | void {
      if (typeof this[code] === 'function') {
         return this[code].call(this);
      }
   }

   private setNickname(nickname: string) {
      this.presenceHandler.getMultiUserContact().setNickname(nickname)
   }

   private getNickname(): string {
      return this.presenceHandler.getNickname();
   }

   /** Inform user that presence refers to itself */
   private 110() {
      this.setNickname(this.presenceHandler.getNickname());

      this.presenceHandler.getMultiUserContact().setMemberListComplete();
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
      return Translation.t('Room_is_now_non-anoymous');
   }

   /** Inform occupants that the room is now semi-anonymous */
   private 173() {
      return Translation.t('Room_is_now_semi-anonymous');
   }

   /** Inform user that a new room has been created */
   private 201() {
      let multiUserContact = this.presenceHandler.getMultiUserContact();
      let promise;

      if (multiUserContact.isAutoJoin() && multiUserContact.isInstantRoom()) {
         promise = multiUserContact.createInstantRoom();
      } else if (multiUserContact.isAutoJoin() && multiUserContact.hasRoomConfiguration()) {
         promise = multiUserContact.createPreconfiguredRoom();
      } else {
         promise = showInstantOrConfigurationDialog(multiUserContact);
      }

      promise.then((stanza) => {
         //@TODO use constant
         if (stanza === 'canceled') {
            this.presenceHandler.inform(Translation.t('Configuration_canceled')); //@TODO translate
         }
      }).catch(() => {

      });
   }

   /** Inform user that he or she has been banned */
   private 301() {
      if (this.isSelfRefered) {
         return Translation.t('muc_removed_banned');
      }

      return Translation.t('muc_removed_info_banned', {
         nickname: this.getNickname(),
         escapeInterpolation: true
      });
   }

   /** Inform user that he or she has been kicked */
   private 307(room, nickname, data, xdata) {
      if (this.isSelfRefered) {
         return Translation.t('muc_removed_kicked');
      }

      return Translation.t('muc_removed_info_kicked', {
         nickname: this.getNickname(),
         escapeInterpolation: true
      });
   }

   /** Inform user that he or she is beeing removed from the room because of an affiliation change */
   private 321(room, nickname) {
      if (this.isSelfRefered) {
         return Translation.t('muc_removed_affiliation');
      }

      return Translation.t('muc_removed_info_affiliation', {
         nickname: this.getNickname(),
         escapeInterpolation: true
      });
   }

   /**
    * Inform user that he or she is beeing removed from the room because the room has been
    * changed to members-only and the user is not a member
    */
   private 322(room, nickname) {
      if (this.isSelfRefered) {
         return Translation.t('muc_removed_membersonly');
      }

      return Translation.t('muc_removed_info_membersonly', {
         nickname: this.getNickname(),
         escapeInterpolation: true
      });
   }

   /**
    * Inform user that he or she is beeing removed from the room because the MUC service
    * is being shut down
    */
   private 332(room) {
      return Translation.t('muc_removed_shutdown');
   }
}

function showInstantOrConfigurationDialog(multiUserContact: MultiUserContact) {
   return new Promise((resolve, reject) => {
      showSelectionDialog({
         header: Translation.t('Room_creation'),
         message: Translation.t('Do_you_want_to_change_the_default_room_configuration'),
         primary: {
            label: Translation.t('Default'),
            cb: function() {
               multiUserContact.setRoomConfiguration(MultiUserContact.INSTANT_ROOMCONFIG);

               let instantRoomPromise = multiUserContact.createInstantRoom();

               resolve(instantRoomPromise);
            }
         },
         option: {
            label: Translation.t('Change'),
            cb: function() {
               let roomConfigurationPromise = showRoomConfigurationDialog(multiUserContact);

               resolve(roomConfigurationPromise);
            }
         }
      });
   });
}
