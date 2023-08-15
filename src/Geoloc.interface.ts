import { IJID } from './JID.interface';

export interface IGeoloc {
   getLat(): number;
   getLon(): number;
   getAlt(): number;
   getAccuracy(): number;
   getAltAccuracy(): number;
   getBearing(): number;
   getSpeed(): number;
   getTimestamp(): Date;
   getFrom(): IJID;
}
