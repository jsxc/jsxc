import { SignalAddress } from "./Signal";


export default class Address {
   private address;

   public static fromString(text: string): Address {
      return SignalAddress.fromString(text);
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

   toString(): string {
      return this.address.toString();
   }

   equals(address: Address): boolean {
      return this.address.toString() === address.toString();
   }
}
