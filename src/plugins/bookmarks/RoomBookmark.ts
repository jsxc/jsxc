import { IJID } from '@src/JID.interface';

export default class RoomBookmark {
   constructor(private id: IJID, private alias?: string, private nickname?: string, private autoJoin: boolean = false) {

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

   public isAutoJoin(): boolean {
      return this.autoJoin;
   }
}
