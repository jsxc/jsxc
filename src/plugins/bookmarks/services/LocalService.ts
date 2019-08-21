import AbstractService from './AbstractService';
import RoomBookmark from '../RoomBookmark';
import IStorage from '@src/Storage.interface';
import JID from '@src/JID';
import { IJID } from '@src/JID.interface';

export default class LocalService extends AbstractService {
   constructor(private storage: IStorage) {
      super();
   }

   public getName(): string {
      return 'local';
   }

   public async getRooms(): Promise<RoomBookmark[]> {
      let data = this.storage.getItem('rooms') || {};
      let rooms = [];

      for (let id in data) {
         let roomData = data[id];

         rooms.push(new RoomBookmark(new JID(id), roomData.alias, roomData.nickname, roomData.autoJoin, roomData.password));
      }

      return rooms;
   }

   public async addRoom(room: RoomBookmark) {
      let data = this.storage.getItem('rooms') || {};
      let id = room.getJid().bare;

      data[id] = {
         alias: room.getAlias(),
         nickname: room.getNickname(),
         autoJoin: room.isAutoJoin(),
         password: room.getPassword(),
      };

      this.storage.setItem('rooms', data);
   }

   public async removeRoom(id: IJID) {
      let data = this.storage.getItem('rooms') || {};

      delete data[id.bare];

      this.storage.setItem('rooms', data);
   }
}
