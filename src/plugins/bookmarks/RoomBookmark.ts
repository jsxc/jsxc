import { IJID } from '@src/JID.interface';

export default class RoomBookmark {
   constructor(private id: IJID, private alias?: string, private nickname?: string, private autoJoin: boolean = false, private password?: string) {

   }

   public getId(): string {
      return this.id.bare;
   }

   public getJid(): IJID {
      return this.id;
   }

   public hasAlias(): boolean {
      return !!this.alias;
   }

   public getAlias(): string {
      return this.alias;
   }

   public hasNickname(): boolean {
      return !!this.nickname;
   }

   public getNickname(): string {
      return this.nickname;
   }

   public hasPassword(): boolean {
      return !!this.password;
   }

   public getPassword(): string {
      return this.password;
   }

   public isAutoJoin(): boolean {
      return this.autoJoin;
   }
}
