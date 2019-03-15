import Account from './Account'
import PersistentMap from '@util/PersistentMap';

const nickRef = 'http://jabber.org/protocol/nick';

export default class Nickname {
/*
   protected account: Account;

   protected data: PersistentMap;
*/
   constructor(private account: Account, private data: PersistentMap) {

   }

   public setNickname(nickname: string): Promise<Element> {
      let element = document.createElement('nick');

      $(element)
         .attr('xmlns', nickRef)
         .text(nickname);

      this.account.getStorage().setItem('nickname', nickname);
      return this.account.getConnection().getPEPService().publish(nickRef, element);
   }

   public getNickname(): string {
      let nickname = this.account.getStorage().getItem('nickname');
      if (!nickname) {
         nickname = this.account.getJID().bare;
      }

      return nickname;
   }

   public getContactNickname(): string {
      return this.data.get('nickname');
   }

   public isNickVisible(): boolean {
      return this.data.get('nickVisible');
   }

   public setContactNickname(nickname: string) {
      this.data.set('nickname', nickname);
   }

   public setNickVisible(value: boolean) {
      this.data.set('nickVisible', value);
   }

   public getNickRef(): string {
      return nickRef;
   }

   public getNickFromStanza(stanza): string {
      return $(stanza).find('nick').text();
   }

}
