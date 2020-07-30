import Translation from '../../../../util/Translation'
import Log from '@util/Log'
import MultiUserContact from '../../../../MultiUserContact'
import MultiUserStatusCodeHandler from './StatusCodeHandler'
import { Strophe } from '../../../../vendor/Strophe'
import JID from '@src/JID';

export default class MultiUserPresenceProcessor {
   private codes: string[];

   constructor(private multiUserContact: MultiUserContact, private xElement, private nickname, type) {
      this.codes = xElement.find('status').map((index, element) => element.getAttribute('code')).get();

      if (type === 'unavailable') {
         this.processUnavailable();
      } else {
         this.processNewMember();
      }

      this.processCodes();

      this.postReason();
   }

   public getMultiUserContact() {
      return this.multiUserContact;
   }

   public getNickname() {
      return this.nickname;
   }

   public getXElement() {
      return this.xElement;
   }

   public inform(msg: string) {
      Log.debug('[MUC] ' + msg);

      this.multiUserContact.addSystemMessage(msg);
   }

   private processUnavailable() {
      let newNickname = this.xElement.find('item').attr('nick');

      if (this.xElement.find('destroy').length > 0) {
         this.getMultiUserContact().shutdown();

         this.inform(Translation.t('This_room_has_been_closed'));
      } else if (this.codes.indexOf('303') > -1 && newNickname) {
         // user changed his nickname

         newNickname = Strophe.unescapeNode(newNickname);

         this.multiUserContact.removeMember(this.nickname);
         this.multiUserContact.addMember(newNickname);

         this.inform(Translation.t('is_now_known_as', {
            oldNickname: this.nickname,
            newNickname,
            escapeInterpolation: true
         }));
      } else {
         this.multiUserContact.removeMember(this.nickname);

         if (this.codes.length === 1 && this.codes.indexOf('110') > -1) {
            this.inform(':door: ' + Translation.t('You_left_the_building'));
         } else if (this.codes.length === 0) {
            this.inform(':door: ' + Translation.t('left_the_building', {
               nickname: this.nickname,
               escapeInterpolation: true
            }));
         }
      }
   }

   private processNewMember() {
      let itemElement = this.xElement.find('item');
      let jidString = itemElement.attr('jid');
      let affiliation = itemElement.attr('affiliation');
      let role = itemElement.attr('role');

      let jid = jidString ? new JID(jidString) : undefined;

      let isNew = this.multiUserContact.addMember(this.nickname, affiliation, role, jid);

      if (isNew && this.multiUserContact.isMemberListComplete()) {
         this.inform(':footprints: ' + Translation.t('entered_the_room', {
            nickname: this.nickname,
            escapeInterpolation: true
         }));
      }
   }

   private processCodes() {
      let msg;
      let statusCodeHandler = new MultiUserStatusCodeHandler(this, this.codes.indexOf('110') > -1);

      for (let code of this.codes) {
         msg = statusCodeHandler.processCode(code);

         if (msg) {
            this.inform(msg);
         }
      }
   }

   private postReason() {
      let actor = {
         name: this.getXElement().find('actor').attr('nick'),
         jid: this.getXElement().find('actor').attr('jid')
      };
      let reason = this.getXElement().find('reason').text();

      if (reason !== '') {
         reason = Translation.t('Reason') + ': ' + reason;

         if (typeof actor.name === 'string' || typeof actor.jid === 'string') {
            //@REVIEW this could be improved
            this.inform((actor.name || actor.jid) + ': ' + reason);
         } else {
            this.inform(reason);
         }
      }
   }
}
