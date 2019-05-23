import Address from '../vendor/Address';

export interface ICiphertext {
   type: number,
   body: string,
   registrationId: number,
}

export default class {
   constructor(private address: Address, private ciphertext: ICiphertext) {

   }

   public getDeviceId(): number {
      return this.address.getDeviceId();
   }

   public isPreKey(): boolean {
      return this.ciphertext.type === 3;
   }

   public getCiphertext(): ICiphertext {
      return this.ciphertext;
   }
}
