enum LogLevel {
   Debug,
   Info,
   Warn,
   Error
};

export default class Log {
   public static info(message:string, data?:any):void {
      console.log(message, data);
   }

   public static debug(message:string, data?:any):void {
      console.log(message, data);
   }

   public static warn(message:string, data?:any):void {
      console.warn(message, data);
   }

   public static error(message:string, data?:any):void {
      console.error(message, data);
   }

   private static getPrefix(level:LogLevel):string {
      return '['+LogLevel[level]+']';
   }
}
