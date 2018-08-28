import Address from "../vendor/Address";

export type Ciphertext = {
   type: number,
   body: string,
   registrationId: number,
}

export default class {
   constructor(private address: Address, private ciphertext: Ciphertext) {

   }

   public getDeviceId(): number {
      return this.address.getDeviceId();
   }

   public isPreKey(): boolean {
      return this.ciphertext.type === 3;
   }

   public getCiphertext(): Ciphertext {
      return this.ciphertext;
   }
}
