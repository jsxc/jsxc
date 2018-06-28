import { ILog } from './Log.interface'

enum LogLevel {
   Debug,
   Info,
   Warn,
   Error
};

export class Logger implements ILog {
   constructor(private prefix: string = '') {
      if (prefix) {
         this.prefix = `[${prefix}]`;
      }
   }

   public info(message: string, ...data): void {
      this.log(LogLevel.Info, message, ...data);
   }

   public debug(message: string, ...data): void {
      this.log(LogLevel.Debug, message, ...data);
   }

   public warn(message: string, ...data): void {
      this.log(LogLevel.Warn, message, ...data);
   }

   public error(message: string, ...data): void {
      this.log(LogLevel.Error, message, ...data);
   }

   private getPrefix(level: LogLevel): string {
      return `${this.prefix}[${LogLevel[level]}] `;
   }

   private log(level: LogLevel, message: string, ...data) {
      if (/*Client.isDebugMode() && */ typeof console !== 'undefined') {
         let logFunction = (level === LogLevel.Warn || level === LogLevel.Error) ? 'warn' : 'log';

         console[logFunction].apply(this, [this.getPrefix(level) + message, ...data]);
      }
   }
}

export default new Logger();
