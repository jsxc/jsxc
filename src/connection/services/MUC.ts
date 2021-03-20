import AbstractService from './AbstractService';
import { IJID } from '../../JID.interface';
import Form from '../Form';
import { $pres, $iq, $msg, Strophe } from '../../vendor/Strophe';
import { IMUCService } from '@connection/Connection.interface';

//@REVIEW this will not be reflected in caps and disco
const NS_CONFERENCE = 'jabber:x:conference';
const NS_BASE = 'http://jabber.org/protocol/muc';
const NS_OWNER = NS_BASE + '#owner';
const NS_USER = NS_BASE + '#user';
const NS_ADMIN = NS_BASE + '#admin';

export type MultiUserAffiliation = 'admin' | 'member' | 'none' | 'outcast' | 'owner';

export default class MUC extends AbstractService implements IMUCService {
   public joinMultiUserRoom(jid: IJID, password?: string) {
      if (jid.isBare()) {
         return Promise.reject('We need a full jid to join a room');
      }

      let pres = $pres({
         to: jid.full,
      }).c('x', {
         xmlns: Strophe.NS.MUC,
      });

      if (password) {
         pres.c('password').t(password).up();
      }

      return this.send(pres);
   }

   public changeNickname(jid: IJID, nickname: string) {
      let newjid = jid.bare + '/' + nickname;

      let pres = $pres({
         to: newjid,
      }).c('x', {
         xmlns: Strophe.NS.MUC,
      });

      return this.send(pres);
   }

   public kickUser(jid: IJID, nickname: string, reason?: string) {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_ADMIN,
         })
         .c('item', { nick: nickname, role: 'none' });

      if (reason && reason.trim().length > 0) {
         iq.c('reason').t(reason);
      }

      return this.sendIQ(iq);
   }

   public changeTopic(roomJid: IJID, topic?: string) {
      let msg = $msg({
         to: roomJid.bare,
         type: 'groupchat',
      })
         .c('subject')
         .t(topic);

      this.send(msg);
   }

   public changeRole(jid: IJID, nickname: string, rolestr: string, reason?: string) {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_ADMIN,
         })
         .c('item', { role: rolestr, nick: nickname });

      if (reason && reason.trim().length > 0) {
         iq.c('reason').t(reason);
      }

      return this.sendIQ(iq);
   }

   public changeAffiliation(jid: IJID, targetjid: IJID, affiliationstr: string) {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_ADMIN,
         })
         .c('item', { affiliation: affiliationstr, jid: targetjid.bare });

      return this.sendIQ(iq);
   }

   public banUser(jid: IJID, targetjid: IJID, reason?: string) {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_ADMIN,
         })
         .c('item', { affiliation: 'outcast', jid: targetjid.bare });

      if (reason && reason.trim().length > 0) {
         iq.c('reason').t(reason);
      }

      return this.sendIQ(iq);
   }

   public leaveMultiUserRoom(jid: IJID, exitMessage?: string) {
      let pres = $pres({
         type: 'unavailable',
         //   id: presenceid,
         to: jid.full,
      });

      if (exitMessage) {
         pres.c('status', exitMessage);
      }

      return this.send(pres);
   }

   public destroyMultiUserRoom(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_OWNER,
         })
         .c('destroy');

      return this.sendIQ(iq);
   }

   public getMemberList(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'get',
      })
         .c('query', {
            xmlns: NS_ADMIN,
         })
         .c('item', { affiliation: 'member' });

      return this.sendIQ(iq);
   }

   public setMemberList(jid: IJID, items: { jid: IJID; affiliation: MultiUserAffiliation }[]): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      });
      let query = iq.c('query', {
         xmlns: NS_ADMIN,
      });

      items.forEach(item => {
         query
            .c('item', {
               affiliation: item.affiliation,
               jid: item.jid.bare,
            })
            .up();
      });

      return this.sendIQ(iq);
   }

   public createInstantRoom(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_OWNER,
         })
         .c('x', {
            xmlns: 'jabber:x:data',
            type: 'submit',
         });

      return this.sendIQ(iq);
   }

   public getRoomConfigurationForm(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'get',
      }).c('query', {
         xmlns: NS_OWNER,
      });

      return this.sendIQ(iq);
   }

   public submitRoomConfiguration(jid: IJID, form: Form): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_OWNER,
         })
         .cnode(form.toXML());

      return this.sendIQ(iq);
   }

   public cancelRoomConfiguration(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set',
      })
         .c('query', {
            xmlns: NS_OWNER,
         })
         .c('x', {
            xmlns: 'jabber:x:data',
            type: 'cancel',
         });

      return this.sendIQ(iq);
   }

   public sendMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: roomJid.bare,
      })
         .c('x', {
            xmlns: NS_USER,
         })
         .c('invite', {
            to: receiverJid.bare,
         });

      if (reason) {
         msg.c('reason').t(reason);
      }

      this.send(msg);
   }

   public declineMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: roomJid.bare,
      })
         .c('x', {
            xmlns: NS_USER,
         })
         .c('decline', {
            to: receiverJid.bare,
         });

      if (reason) {
         msg.c('reason').t(reason);
      }

      this.send(msg);
   }

   public sendDirectMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string, password?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: receiverJid.bare,
      }).c('x', {
         xmlns: NS_CONFERENCE,
         jid: roomJid.bare,
         reason,
         password,
      });

      this.send(msg);
   }
}
