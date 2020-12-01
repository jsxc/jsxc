import { IJID } from '@src/JID.interface';
import RoomBookmark from '../RoomBookmark';

export default abstract class AbstractService {
   public abstract getName(): string

   public abstract getRooms(): Promise<RoomBookmark[]>

   public abstract addRoom(room: RoomBookmark): Promise<void>

   public abstract removeRoom(id: IJID): Promise<void>
}
