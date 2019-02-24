import Account from './Account'
import JID from "@src/JID";
import PersistentMap from "@util/PersistentMap";

const nickRef = 'http://jabber.org/protocol/nick';

export default class Nickname{

   protected account: Account;

   protected data: PersistentMap;

   constructor(accountData: Account, contactData: PersistentMap){
      this.account = accountData;
      this.data = contactData;

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

   public getContactNickname(): string{
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

   public getNickRef(): string{
      return nickRef;
   }

   public nickHandler(stanza): boolean {
      let element = $(stanza);
      let nickname: string = element.find('nick[xmlns="' + nickRef + '"]').text();
      let peerJID = new JID(element.attr('from'));
      let peer = this.account.getContact(peerJID); // why undefinded??
      peer.getNicknameObject().setContactNickname(nickname);
      return true;
   }

   public getNickFromStanza(stanza): string{
      return $(stanza).find('nick').text();
   }

}
