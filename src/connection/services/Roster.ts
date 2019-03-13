import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $pres, $iq } from '../../vendor/Strophe'

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
      // Shortcut to remove buddy from roster and cancel all subscriptions
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
      let nicknameObject = this.account.getContact().getNicknameObject();
      let nickname = nicknameObject.getNickname();
      let reference = nicknameObject.getNickRef();
      // send subscription request to buddy (trigger onRosterChanged)
      this.send($pres({
         to: jid.full,
         type: 'subscribe'
      }).c('nick', {
         xmlns: reference
      }).t(nickname));
   }
}
