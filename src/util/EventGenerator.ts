export default class EventGenerator<Element = unknown> {
   private queue: Element[] = [];

   private generatorInstance: AsyncGenerator<Element, void, void>;

   private resolve: (value: unknown) => any = () => undefined;

   private isDone = false;

   constructor() {
      this.generatorInstance = this.generator();
   }

   public getGenerator() {
      return this.generatorInstance;
   }

   public done() {
      this.isDone = true;

      this.resolve(undefined);
   }

   public push(element: Element) {
      if (this.isDone) {
         return;
      }

      this.queue.push(element);

      if (this.queue.length === 1) {
         this.resolve(undefined);
      }
   }

   private async *generator() {
      while (!this.isDone) {
         if (this.queue.length === 0) {
            await new Promise(r => (this.resolve = r));
         }

         if (!this.isDone) {
            yield this.queue.shift();
         }
      }
   }
}
