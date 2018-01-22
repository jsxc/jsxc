export default class BaseError {
   constructor(private message: string) {

   }

   public toString(): string {
      return this.message;
   }
}
