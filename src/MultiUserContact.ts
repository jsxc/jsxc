import Contact from './Contact'
import JID from './JID'
import MultiUserChatWindow from './ui/MultiUserChatWindow'
import PersistentMap from './util/PersistentMap'
import { Presence } from './connection/AbstractConnection'
import Form from './connection/Form'
import Account from './Account'
import { ContactSubscription } from './Contact.interface'
import { IMUCService } from '@connection/Connection.interface';
import { IJID } from './JID.interface';

export const enum AFFILIATION {
   ADMIN = 'admin',
   MEMBER = 'member',
   OUTCAST = 'outcast',
   OWNER = 'owner',
   NONE = 'none'
};
export const enum ROLE {
   MODERATOR = 'moderator',
   PARTICIPANT = 'participant',
   VISITOR = 'visitor',
   NONE = 'none'
};
// const enum ROOMSTATE {
//    INIT,
//    ENTERED,
//    EXITED,
//    AWAIT_DESTRUCTION,
//    DESTROYED,
// };
export const enum ROOMCONFIG {
   INSTANT = 'instant'
};

export default class MultiUserContact extends Contact {

   public static INSTANT_ROOMCONFIG = ROOMCONFIG.INSTANT;

   public static TYPE = 'groupchat';

   private members: PersistentMap;

   constructor(account: Account, jid: IJID, name?: string);
   constructor(account: Account, id: string);
   constructor() {
      super(arguments[0], arguments[1], arguments[2]);

      this.data.set('type', MultiUserContact.TYPE);
   }

   private getMembers(): PersistentMap {
      if (!this.members) {
         this.members = new PersistentMap(this.account.getStorage(), 'members', this.getId());
      }

      return this.members
   }

   private getService(): IMUCService {
      return this.account.getConnection().getMUCService();
   }

   public async invite(jid: JID, reason?: string) {
      let discoInfo = await this.account.getDiscoInfoRepository().requestDiscoInfo(this.getJid());
      let isMembersOnly = discoInfo.hasFeature('muc_membersonly');

      if (isMembersOnly) {
         this.getService().sendMediatedMultiUserInvitation(jid, this.getJid(), reason);

         return;
      }

      let contact = this.account.getContact(jid);
      let resources = jid.resource ? [jid.resource] : contact.getResources();

      if (resources.length > 0) {
         for (let resource of resources) {
            if (contact.hasFeatureByResource(resource, 'jabber:x:conference')) {
               let password = this.data.get('password');
               this.getService().sendDirectMultiUserInvitation(jid, this.getJid(), reason, password);
            }
         }

         return;
      }

      throw new Error('No invitation method available');
   }

   public join() {
      this.data.set('joinDate', new Date());
      this.data.set('memberListComplete', false);
      this.removeAllMembers();

      return this.getService().joinMultiUserRoom(new JID(this.jid.bare, this.getNickname()), this.data.get('password'));
   }

   public leave() {
      return this.getService().leaveMultiUserRoom(this.getJid());
   }

   public destroy() {
      return this.getService().destroyMultiUserRoom(this.getJid());
   }

   public createInstantRoom() {
      return this.getService().createInstantRoom(this.jid);
   }

   public createPreconfiguredRoom() {
      if (!this.hasRoomConfiguration()) {
         return Promise.reject('No saved room configuration');
      }

      let form = Form.fromJSON(this.getRoomConfiguration());

      return this.getService().submitRoomConfiguration(this.getJid(), form);
   }

   public setNickname(nickname: string) {
      //@TODO update ui according to affiliation and role
      this.data.set('nickname', nickname);
      this.setResource(nickname); //@REVIEW do we need the nickname field?
   }

   public getNickname(): string {
      return this.data.get('nickname');
   }

   public getChatWindow(): MultiUserChatWindow {
      if (!this.chatWindow) {
         this.chatWindow = new MultiUserChatWindow(this);
      }

      return this.chatWindow;
   }

   public getMember(nickname: string): {affiliation?: AFFILIATION, role?: ROLE, jid?: JID} {
      let data = this.getMembers().get(nickname) || {};

      data.jid = data.jid ? new JID(data.jid) : undefined;

      return data;
   }

   public addMember(nickname: string, affiliation?: AFFILIATION, role?: ROLE, jid?: JID): boolean {
      let isNewMember = !this.getMembers().get(nickname);

      this.getMembers().set(nickname, {
         affiliation,
         role,
         jid: jid ? jid.full : undefined
      });

      return isNewMember
   }

   public removeMember(nickname: string) {
      this.getMembers().remove(nickname);

      if (nickname === this.getNickname()) {
         this.shutdown();
      }
   }

   public getMemberIds(): string[] {
      return this.getMembers().getAllKeys();
   }

   public getSubscription(): ContactSubscription {
      return ContactSubscription.BOTH;
   }

   public setSubject(subject: string) {
      this.data.set('subject', subject);
   }

   public getSubject(): string {
      return this.data.get('subject');
   }

   public getPassword(): string {
      return this.data.get('password');
   }

   public setPassword(password: string) {
      this.data.set('password', password);
   }

   public setAutoJoin(autoJoin: boolean) {
      this.data.set('autoJoin', autoJoin);
   }

   public isAutoJoin(): boolean {
      return !!this.data.get('autoJoin');
   }

   public setBookmark(bookmark: boolean) {
      this.data.set('bookmark', bookmark);
   }

   public isBookmarked(): boolean {
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

   public isInstantRoom(): boolean {
      return this.data.get('roomConfig') === ROOMCONFIG.INSTANT;
   }

   public isMemberListComplete(): boolean {
      return this.data.get('memberListComplete');
   }

   public setMemberListComplete() {
      this.data.set('memberListComplete', true);
   }

   public getJoinDate(): Date {
      let dateString = this.data.get('joinDate');

      return dateString ? new Date(dateString) : undefined;
   }

   public registerMemberHook(id: string, func: (newValue: any, oldValue: any, key: string) => void);
   public registerMemberHook(func: (newValue: any, oldValue: any, key: string) => void);
   public registerMemberHook() {
      this.getMembers().registerHook.apply(this.getMembers(), arguments);
   }

   public registerNewMemberHook(func: (value: any, nickname: string) => void) {
      this.getMembers().registerNewHook(func);
   }

   public registerRemoveMemberHook(func: (nickname: string) => void) {
      this.getMembers().registerRemoveHook(func);
   }

   public isPersistent() {
      return this.isBookmarked();
   }

   public shutdown() {
      this.data.set('resources', {});
      this.data.set('presence', Presence.offline);

      this.setNickname(null);
      this.removeAllMembers();
   }

   private removeAllMembers() {
      this.getMembers().empty();
   }
}
