import { SignalAddress } from "./Signal";


export default class Address {
   private address;

   public static fromString(text: string): Address {
      let index = text.lastIndexOf('.');
      let [name, deviceId] = [text.slice(0, index), text.slice(index)];

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

   toString(): string {
      return this.address.toString();
   }

   equals(address: Address): boolean {
      return this.address.toString() === address.toString();
   }
}
