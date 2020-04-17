
const MAX_PRIORITY = 100;
const MIN_PRIORITY = 0;

type Params = any[];

export default class Pipe<params extends Params = any[]> {

   private pipe = [];

   constructor() {

   }

   public addProcessor(processor: (...args: params) => Promise<params> | params, priority: number = 50) {
      if (isNaN(priority) || priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
         throw new Error('Priority has to be between 0 and 100');
      }

      if (typeof this.pipe[priority] === 'undefined') {
         this.pipe[priority] = [];
      }

      this.pipe[priority].push(processor);
   }

   public run(...args: params): Promise<params> {
      let chain = Promise.resolve(args);

      this.pipe.forEach((processors) => {
         if (typeof processors === 'undefined' || processors === null || typeof processors !== 'object' || !processors.length) {
            return;
         }

         processors.forEach((processor) => {
            chain = chain.then((args2: any[]) => {
               return processor.apply(this, args2);
            });
         });
      });

      return chain;
   }

   public destroy() {
      this.pipe = [];
   }
}
