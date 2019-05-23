export default class BaseError {
   constructor(private message: string, private errorCode?: string) {

   }

   public toString(): string {
      return this.message;
   }

   public getErrorCode(): string {
      return this.errorCode;
   }
}
