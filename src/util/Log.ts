import { ILog } from './Log.interface'
import Client from '../Client';

enum LogLevel {
   Debug,
   Info,
   Warn,
   Error
};

const MAX_LOG_SIZE = 100;

export class Logger implements ILog {
   private logs: string[] = [];

   constructor(private prefix: string = '') {
      if (prefix) {
         this.prefix = `[${prefix}]`;
      }
   }

   public getLogs(): string[] {
      return this.logs;
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
      let args = [this.getPrefix(level) + message, ...data];

      this.logs.push(args.map(arg => {
         if (typeof arg === 'string') {
            return arg;
         } else if (arg && arg.tagName && arg.outerHTML) {
            return arg.outerHTML;
         } else {
            return JSON.stringify(arg);
         }
      }).join(' '));

      if (this.logs.length > MAX_LOG_SIZE) {
         this.logs.shift();
      }

      if (typeof console !== 'undefined') {
         if (!Client.isDebugMode() && level === LogLevel.Debug) {
            return;
         }

         let logFunction = (level === LogLevel.Warn || level === LogLevel.Error) ? 'warn' : 'log';

         console[logFunction].apply(this, args);
      }
   }
}

export default new Logger();
