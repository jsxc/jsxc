import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import Form from '../Form'
import { $pres, $iq, $msg } from '../../vendor/Strophe'

export default class MUC extends AbstractService {
   public joinMultiUserRoom(jid: IJID, password?: string) {
      if (jid.isBare()) {
         return Promise.reject('We need a full jid to join a room');
      }

      let pres = $pres({
         to: jid.full
      }).c('x', {
         xmlns: Strophe.NS.MUC
      });

      if (password) {
         pres.c('password').t(password).up();
      }

      return this.send(pres);
   }

   public leaveMultiUserRoom(jid: IJID, exitMessage?: string) {
      let pres = $pres({
         type: 'unavailable',
         //   id: presenceid,
         to: jid.full
      });

      if (exitMessage) {
         pres.c('status', exitMessage);
      }

      return this.send(pres);
   }

   public destroyMultiUserRoom(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('query', {
         xmlns: 'http://jabber.org/protocol/muc#owner' //@TODO use namespace object
      }).c('destroy');

      return this.sendIQ(iq);
   }

   public createInstantRoom(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('query', {
         xmlns: 'http://jabber.org/protocol/muc#owner'
      }).c('x', {
         xmlns: 'jabber:x:data',
         type: 'submit'
      });

      return this.sendIQ(iq);
   }

   public getRoomConfigurationForm(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'get'
      }).c('query', {
         xmlns: 'http://jabber.org/protocol/muc#owner'
      });

      return this.sendIQ(iq);
   }

   public submitRoomConfiguration(jid: IJID, form: Form): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('query', {
         xmlns: 'http://jabber.org/protocol/muc#owner'
      }).cnode(form.toXML());

      return this.sendIQ(iq);
   }

   public cancelRoomConfiguration(jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.bare,
         type: 'set'
      }).c('query', {
         xmlns: 'http://jabber.org/protocol/muc#owner'
      }).c('x', {
         xmlns: 'jabber:x:data',
         type: 'cancel'
      });

      return this.sendIQ(iq);
   }

   public sendMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: roomJid.bare
      }).c('x', {
         xmlns: 'http://jabber.org/protocol/muc#user'
      }).c('invite', {
         to: receiverJid.bare
      });

      if (reason) {
         msg.c('reason').t(reason);
      }

      this.send(msg);
   }

   public declineMediatedMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: roomJid.bare
      }).c('x', {
         xmlns: 'http://jabber.org/protocol/muc#user'
      }).c('decline', {
         to: receiverJid.bare
      });

      if (reason) {
         msg.c('reason').t(reason);
      }

      this.send(msg);
   }

   public sendDirectMultiUserInvitation(receiverJid: IJID, roomJid: IJID, reason?: string, password?: string) {
      //@REVIEW id?
      let msg = $msg({
         to: receiverJid.bare
      }).c('x', {
         xmlns: 'jabber:x:conference', //@TODO
         jid: roomJid.bare,
         reason: reason,
         password: password
      });

      this.send(msg);
   }
}
