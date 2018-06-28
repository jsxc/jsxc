
export interface ILog {
   info(message: string, ...data): void

   debug(message: string, ...data): void

   warn(message: string, ...data): void

   error(message: string, ...data): void
}
