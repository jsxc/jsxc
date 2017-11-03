
const MAX_PRIORITY = 100;
const MIN_PRIORITY = 0;

export default class Pipe {
   private static instances = {};

   public static get(name: string): Pipe {
      if (typeof Pipe.instances[name] === 'undefined') {
         Pipe.instances[name] = new Pipe();
      }

      return Pipe.instances[name];
   }

   private pipe = [];

   constructor() {

   }

   public addProcessor(processor: (...args) => Promise<any> | Array<any>, priority: number = 50) {
      if (isNaN(priority) || priority < MIN_PRIORITY || priority > MAX_PRIORITY) {
         throw 'Priority has to be between 0 and 100';
      }

      if (typeof this.pipe[priority] === 'undefined') {
         this.pipe[priority] = [];
      }

      this.pipe[priority].push(processor);
   }

   public run(...args) {
      let chain = Promise.resolve(args);

      this.pipe.forEach((processors) => {
         if (typeof processors === 'undefined' || processors === null || typeof processors !== 'object' || !processors.length) {
            return;
         }

         processors.forEach((processor) => {
            chain = chain.then((args2: Array<any>) => {
               return processor.apply(this, args2);
            });
         });
      });

      return chain;
   }
}
