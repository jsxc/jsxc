import Client from './Client'

export default class PageVisibility {
   private static isInitialized = false;

   public static init() {
      if (PageVisibility.isInitialized) {
         return;
      }

      PageVisibility.isInitialized = true;

      Client.getStorage().registerHook('isHidden', (hidden) => {
         if (hidden && !document.hidden) {
            Client.getStorage().setItem('isHidden', document.hidden);
         }
      })

      function visibilityChangeHandler() {
         Client.getStorage().setItem('isHidden', document.hidden);
      }

      $(document).on('visibilitychange', visibilityChangeHandler);
      visibilityChangeHandler();
   }

   public static isHidden() {
      return Client.getStorage().getItem('isHidden');
   }

   public static isVisible() {
      return !PageVisibility.isHidden();
   }
}
