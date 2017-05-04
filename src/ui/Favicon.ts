
export default class Favicon {
   public static init() {
      var fo = jsxc.options.get('favicon');
      if (fo && fo.enable) {
         jsxc.gui.favicon = new Favico({
            animation: 'pop',
            bgColor: fo.bgColor,
            textColor: fo.textColor
         });

         jsxc.gui.favicon.badge(jsxc.storage.getUserItem('unreadMsg') || 0);
      }
   }
}
