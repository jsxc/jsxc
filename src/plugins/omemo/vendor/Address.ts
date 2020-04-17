import { SignalAddress } from './Signal';

export default class Address {
   private address;

   public static fromString(text: string): Address {
      let matches = text.match(/^(.+?)(?:\.(\d+))?$/);
      let name = matches[1];
      let deviceId = matches[2];

      return new SignalAddress(name, deviceId);
   }

   constructor(name: string, deviceId: number) {
      this.address = new SignalAddress(name, deviceId);
   }

   public getName(): string {
      return this.address.getName();
   }

   public getDeviceId(): number {
      return this.address.getDeviceId();
   }

   public toString(): string {
      return this.address.toString();
   }

   public equals(address: Address): boolean {
      return this.address.toString() === address.toString();
   }
}
