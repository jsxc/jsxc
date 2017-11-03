
export default class Menu {
   public static init(elements: JQuery);
   public static init(query: string);
   public static init() {
      let elements = arguments[0];

      if (typeof elements === 'string') {
         elements = $(elements);
      }

      elements.disableSelection();

      //elements.addClass('jsxc-list');

      elements.each(function() {
         new Menu($(this));
      });
   }

   private timer;

   private constructor(private element: JQuery) {
      var ul = element.find('ul');

      element.click(this.onClick);
      element.mouseleave(this.onMouseLeave);
      element.mouseenter(this.onMouseEnter);
   }

   private onClick = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();

      $('body').off('click', null, this.closeMenu);

      // hide other lists
      $('body').click();

      window.clearTimeout(this.timer);

      this.element.toggleClass('jsxc-opened');

      if (this.element.hasClass('jsxc-opened')) {
         $('body').on('click', this.closeMenu);
      }
   }

   private onMouseLeave = () => {
      if (this.element.hasClass('jsxc-opened')) {
         this.timer = window.setTimeout(this.closeMenu, 2000);
      }
   }

   private onMouseEnter = () => {
      window.clearTimeout(this.timer);
   }

   private closeMenu = () => {
      this.element.removeClass('jsxc-opened');

      $('body').off('click', null, this.closeMenu);
   }
}
