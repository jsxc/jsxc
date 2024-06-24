import { IGeoloc } from './Geoloc.interface';
import { IJID } from './JID.interface';

export default class implements IGeoloc {
   constructor(
      private from: IJID,
      private lat: number,
      private lon: number,
      private timestamp: Date,
      private alt?: number,
      private accuracy?: number,
      private speed?: number,
      private bearing?: number,
      private altaccuracy?: number
   ) {}
   public getFrom() {
      return this.from;
   }
   public getLat(): number {
      return this.lat;
   }
   public getLon(): number {
      return this.lon;
   }
   public getAlt(): number {
      return this.alt;
   }
   public getAccuracy(): number {
      return this.accuracy;
   }
   public getAltAccuracy(): number {
      return this.altaccuracy;
   }
   public getBearing(): number {
      return this.bearing;
   }
   public getSpeed(): number {
      return this.speed;
   }
   public getTimestamp(): Date {
      return this.timestamp;
   }
}
