import Log from './Log';

const MAX_PRIORITY = 100;
const MIN_PRIORITY = 0;

export default class Pipe<Params extends any[] = any[]> {
   private pipe: ((...args: Params) => Promise<Params> | Params)[][] = [];

   constructor() {}

   public addProcessor(processor: (...args: Params) => Promise<Params> | Params, priority: number = 50) {
      if (isNaN(priority) || priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
         throw new Error('Priority has to be between 0 and 100');
      }

      if (typeof this.pipe[priority] === 'undefined') {
         this.pipe[priority] = [];
      }

      this.pipe[priority].push(processor);
   }

   public run(...args: Params): Promise<Params> {
      let chain = Promise.resolve(args);

      this.pipe.forEach(processors => {
         if (
            typeof processors === 'undefined' ||
            processors === null ||
            typeof processors !== 'object' ||
            !processors.length
         ) {
            return;
         }

         processors.forEach(processor => {
            chain = chain
               .then((args2: Params) => {
                  return processor.apply(this, args2);
               })
               .then(args3 => {
                  if (args.length !== args3.length) {
                     Log.warn('Bad processor detected', processor);
                  }

                  return args3;
               });
         });
      });

      return chain;
   }

   public destroy() {
      this.pipe = [];
   }
}
