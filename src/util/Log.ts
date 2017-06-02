import Client from '../Client';

enum LogLevel {
   Debug,
   Info,
   Warn,
   Error
};

export default class Log {
   public static info(message:string, data?:any):void {
      Log.log(LogLevel.Info, message, data);
   }

   public static debug(message:string, data?:any):void {
      Log.log(LogLevel.Debug, message, data);
   }

   public static warn(message:string, data?:any):void {
      Log.log(LogLevel.Warn, message, data);
   }

   public static error(message:string, data?:any):void {
      Log.log(LogLevel.Error, message, data);
   }

   private static getPrefix(level:LogLevel):string {
      return '['+LogLevel[level]+'] ';
   }

   private static log(level:LogLevel, message:string, data?:any) {
      if (Client.isDebugMode() && typeof console !== 'undefined') {
         let logFunction = (level === LogLevel.Warn || level === LogLevel.Error) ? 'warn' : 'log';

         console[logFunction](Log.getPrefix(level) + message, data);
      }
   }
}
