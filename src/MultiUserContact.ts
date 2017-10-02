import Contact from './Contact'
import JID from './JID'
import MultiUserChatWindow from './ui/MultiUserChatWindow'
import PersistentMap from './util/PersistentMap'
import {Presence} from './connection/AbstractConnection'

const AFFILIATION = {
   ADMIN: 'admin',
   MEMBER: 'member',
   OUTCAST: 'outcast',
   OWNER: 'owner',
   NONE: 'none'
};
const ROLE =  {
   MODERATOR: 'moderator',
   PARTICIPANT: 'participant',
   VISITOR: 'visitor',
   NONE: 'none'
};
const ROOMSTATE = {
   INIT: 0,
   ENTERED: 1,
   EXITED: 2,
   AWAIT_DESTRUCTION: 3,
   DESTROYED: 4
};
const ROOMCONFIG = {
   INSTANT: 'instant'
};

export default class MultiUserContact extends Contact {

   public static INSTANT_ROOMCONFIG = ROOMCONFIG.INSTANT;

   private members:PersistentMap;

   constructor(account:Account, jid:JID, name?:string);
   constructor(account:Account, id:string);
   constructor() {
      super(arguments[0], arguments[1], arguments[3]);

      this.data.set('type', 'groupchat');

      this.members = new PersistentMap(this.account.getStorage(), 'members', this.getId());
   }

   public join() {
      return this.account.getConnection().joinMultiUserRoom(new JID(this.jid.bare, this.getNickname()), this.data.get('password'));
   }

   public leave() {
      this.account.getConnection().leaveMultiUserRoom(this.getJid());
   }

   public destroy() {
      this.account.getConnection().destroyMultiUserRoom(this.getJid());
   }

   public createInstantRoom() {
      return this.account.getConnection().createInstantRoom(this.jid);
   }

   public setNickname(nickname:string) {
      //@TODO update ui according to affiliation and role
      this.data.set('nickname', nickname);
   }

   public getNickname():string {
      return this.data.get('nickname');
   }

   public getChatWindow() {
      if(!this.chatWindow) {
         this.chatWindow = new MultiUserChatWindow(this.account, this);
      }

      return this.chatWindow;
   }

   public delete() {

   }

   public addMember(nickname:string, affiliation?, role?, jid?:JID):boolean {
      let isNewMember = !this.members.get(nickname);

      this.members.set(nickname, {
         affiliation: affiliation,
         role: role,
         jid: jid.full
      });

      return isNewMember
   }

   public removeMember(nickname:string) {
      this.members.remove(nickname);

      if (nickname === this.getNickname()) {
         this.shutdown();
      }
   }

   public getMembers():string[] {
      return this.members.getAllKeys();
   }

   public getSubscription() {
      return 'both';
   }

   public setSubject(subject:string) {
      this.data.set('subject', subject);
   }

   public getSubject():string {
      return this.data.get('subject');
   }

   public setPassword(password:string) {
      this.data.set('password', password);
   }

   public setAutoJoin(autoJoin:boolean) {
      this.data.set('autoJoin', autoJoin);
   }

   public isAutoJoin():boolean {
      return !!this.data.get('autoJoin');
   }

   public setBookmark(bookmark:boolean) {
      this.data.set('bookmark', bookmark);
   }

   public isBookmarked():boolean {
      return !!this.data.get('bookmark');
   }

   public setRoomConfiguration(roomConfig) {
      this.data.set('roomConfig', roomConfig);
   }

   public getRoomConfiguration() {
      let roomConfig = this.data.get('roomConfig');

      return roomConfig !== ROOMCONFIG.INSTANT ? roomConfig : undefined;
   }

   public hasRoomConfiguration() {
      let roomConfig = this.data.get('roomConfig');

      return typeof roomConfig === 'object' && roomConfig !== null;
   }

   public isInstantRoom():boolean {
      return this.data.get('roomConfig') === ROOMCONFIG.INSTANT;
   }

   public registerMemberHook(id:string, func: (newValue: any, oldValue: any, key: string) => void);
   public registerMemberHook(func: (newValue: any, oldValue: any, key: string) => void);
   public registerMemberHook() {
      this.members.registerHook.apply(this.members, arguments);
   }

   public registerNewMemberHook(func: (value:any, nickname:string) => void) {
      this.members.registerNewHook(func);
   }

   public registerRemoveMemberHook(func: (nickname:string) => void) {
      this.members.registerRemoveHook(func);
   }

   private shutdown() {
      this.data.set('resources', {});
      this.data.set('presence', Presence.offline);

      this.setNickname(null);
      this.removeAllMembers();
   }

   private removeAllMembers() {
      this.members.empty();
   }
}
