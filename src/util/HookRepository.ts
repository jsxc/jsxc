
export default class HookRepository<T extends Function> {
   private hooks = {};

   public registerHook(eventName: string, func: T) {
      if (!this.hooks[eventName]) {
         this.hooks[eventName] = [];
      }

      this.hooks[eventName].push(func);
   }

   public removeHook(eventName: string, func: T) {
      let eventNameList = this.hooks[eventName] || [];

      if (eventNameList.indexOf(func) > -1) {
         eventNameList = $.grep(eventNameList, function(i) {
            return func !== i;
         });
      }

      this.hooks[eventName] = eventNameList;
   }

   public trigger(targetEventName: string, ...args) {
      let hooks = this.hooks;

      let eventNames = Object.keys(hooks);
      eventNames.forEach(function(eventName) {
         if (targetEventName === eventName || targetEventName.indexOf(eventName + ':') === 0) {
            let eventNameHooks = hooks[eventName] || [];
            eventNameHooks.forEach(function(hook) {
               hook.apply({}, args);
            });
         }
      });
   }
}
