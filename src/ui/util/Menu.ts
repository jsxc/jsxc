const CLASSNAME_OPENED = 'jsxc-menu--opened';

export default class Menu {
   public static init(elements: JQuery);
   public static init(query: string);
   public static init() {
      let elements = arguments[0];

      if (typeof elements === 'string') {
         elements = $(elements);
      }

      elements.each(function () {
         new Menu($(this));
      });
   }

   private timer;
   private listElement;

   constructor(private element: JQuery) {
      if (element.length !== 1) {
         throw new Error('Found 0 or more than 1 root elements');
      }

      this.listElement = element.find('ul');

      if (this.listElement.length !== 1) {
         throw new Error('Found 0 or more than 1 list elements');
      }

      element.click(this.onClick);
      element.mouseleave(this.onMouseLeave);
      element.mouseenter(this.onMouseEnter);

      element.data('object', this);
   }

   public addEntry(label: string, handler: (ev?) => void, className?: string): JQuery {
      let itemElement = $('<li>');

      itemElement.addClass(className);
      itemElement.text(label);
      itemElement.click(handler);
      itemElement.appendTo(this.listElement);

      return itemElement;
   }

   public getElement(): JQuery {
      return this.element;
   }

   public getButtonElement(): JQuery {
      return this.element.find('.jsxc-menu__button');
   }

   private onClick = ev => {
      ev.stopPropagation();
      ev.preventDefault();

      $('body').off('click', null, this.closeMenu);

      // hide other lists
      $('body').click();

      window.clearTimeout(this.timer);

      if (!$(ev.target).hasClass("jsxc-input-search"))
      {
         this.element.toggleClass(CLASSNAME_OPENED);
      }

      if ($(ev.currentTarget).find('.jsxc-input-search').length>0)
      {
         setTimeout(()=>{$(ev.currentTarget).find('.jsxc-input-search').focus();},50);
      }

      if (this.element.hasClass(CLASSNAME_OPENED)) {
         $('body').on('click', this.closeMenu);
      }
   };

   private onMouseLeave = () => {
      if (this.element.hasClass(CLASSNAME_OPENED)) {
         this.timer = window.setTimeout(this.closeMenu, 2000);
      }
   };

   private onMouseEnter = () => {
      window.clearTimeout(this.timer);
   };

   private closeMenu = () => {
      this.element.removeClass(CLASSNAME_OPENED);
      if (this.element.find(".jsxc-input-search").length>0){
         this.element.find(".jsxc-input-search").val(null);
      }

      $('body').off('click', null, this.closeMenu);
   };
}
