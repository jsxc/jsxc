import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $pres, $iq } from '../../vendor/Strophe'
import rosterChange from "@connection/xmpp/handlers/rosterChange";
import contact from "@ui/dialogs/contact";
import PEP from "@connection/services/PEP";

export default class Roster extends AbstractService {
   public getRoster(version?: string): Promise<Element> {
      let iq = $iq({
         type: 'get'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      });

      if (typeof version === 'string' || (typeof version === 'number' && !isNaN(version))) {
         iq.attrs({
            ver: version,
         });
      }

      return this.sendIQ(iq);
   }

   public removeContact(jid: IJID): Promise<Element> {
<<<<<<< HEAD
      let self = this;

      // Shortcut to remove buddy from roster and cancel all subscriptions
=======
      // Shortcut to remove buddy from roster and cancle all subscriptions
>>>>>>> upstream/refactoring
      let iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: NS.get('ROSTER')
      }).c('item', {
         jid: jid.bare,
         subscription: 'remove'
      });

      return this.sendIQ(iq);
   }

   public addContact(jid: IJID, alias: string): Promise<Element> {
      let waitForRoster = this.addContactToRoster(jid, alias);

      this.sendSubscriptionRequest(jid);
      this.account.getConnection().getPEPService().subscribe('http://jabber.org/protocol/nick', undefined);

      return waitForRoster;
   }

   public setDisplayName(jid: IJID, displayName: string): Promise<Element> {
      let iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      }).c('item', {
         jid: jid.bare,
         name: displayName
      });

      return this.sendIQ(iq);
   }

   public sendSubscriptionAnswer(to: IJID, accept: boolean) {
      let presenceStanza = $pres({
         to: to.bare,
         type: (accept) ? 'subscribed' : 'unsubscribed'
      });

      if (accept) {
         this.account.getConnection().getPEPService().subscribe('http://jabber.org/protocol/nick', this.account.getContact(to).setNickname);
      }

      this.send(presenceStanza);
   }

   private addContactToRoster(jid: IJID, alias: string) {
      let iq = $iq({
         type: 'set'
      }).c('query', {
         xmlns: 'jabber:iq:roster'
      }).c('item', {
         jid: jid.full,
         name: alias || ''
      });

      return this.sendIQ(iq);
   }

   private sendSubscriptionRequest(jid: IJID) {
      // send subscription request to buddy (trigger onRosterChanged)
      this.send($pres({
         to: jid.full,
         type: 'subscribe'
      }).c('nick', {
         xmlns: 'http://jabber.org/protocol/nick'
      }).t(this.account.getNickname()));
   }
}
