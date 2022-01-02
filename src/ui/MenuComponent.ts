import Menu from '@src/Menu';

const CLASSNAME_OPENED = 'jsxc-menu--opened';
const menuTemplate = require('../../template/menu.hbs');

export default class MenuComponent<Params extends unknown[]> {
   private element: JQuery<HTMLElement>;

   private timer: number;

   constructor(
      label: string | { text: string; icon: string },
      type: 'pushup' | 'vertical-left' | 'vertical-right',
      private menu: Menu<Params>,
      private params: Params,
      theme: 'dark' | 'light' = 'light'
   ) {
      this.element = $(
         menuTemplate({
            classes: `jsxc-menu--${type} jsxc-menu--${theme}`,
            labelText: typeof label === 'object' ? label.text : '',
         })
      );

      const icon = typeof label === 'string' ? label : label.icon;

      if (icon) {
         this.element.find('.jsxc-menu__button').prepend($('<i>').addClass(`jsxc-icon-${icon} jsxc-icon--center`));
      }

      this.registerHandlers();
   }

   public getElement(): JQuery<HTMLElement> {
      return this.element;
   }

   public getButtonElement(): JQuery {
      return this.element.find('.jsxc-menu__button');
   }

   public toggle(): void {
      if (this.element.hasClass(CLASSNAME_OPENED)) {
         this.closeMenu();
      } else {
         this.openMenu();
      }
   }

   private addEntry(
      label: string,
      handler: (ev: JQuery.ClickEvent) => void,
      icon?: string,
      disabled?: boolean
   ): JQuery {
      let itemElement = $('<li>');

      if (disabled) {
         itemElement.addClass('jsxc-disabled');
      }

      itemElement.text(label);
      itemElement.on('click', handler);

      if (icon) {
         itemElement.prepend($('<i>').addClass(`jsxc-icon-${icon} jsxc-icon--center`));
      }

      this.element.find('ul').append(itemElement);

      return itemElement;
   }

   private clearEntries() {
      this.element.find('ul').empty();
   }

   private registerHandlers() {
      this.element.on('click', this.onClick);
      this.element.on('mouseleave', this.onMouseLeave);
      this.element.on('mouseenter', this.onMouseEnter);
   }

   private onClick = (ev: JQuery.ClickEvent) => {
      ev.stopPropagation();
      ev.preventDefault();

      this.toggle();
   };

   private onMouseLeave = () => {
      if (this.element.hasClass(CLASSNAME_OPENED)) {
         this.timer = window.setTimeout(this.closeMenu, 2000);
      }
   };

   private onMouseEnter = () => {
      window.clearTimeout(this.timer);
   };

   private openMenu = () => {
      this.clearEntries();

      this.menu.getMenuItems(...this.params).map(({ label, handler, disabled, icon }) => {
         this.addEntry(label, (ev: JQuery.ClickEvent) => handler(ev.originalEvent), icon, disabled);
      });

      $('body').off('click', null, this.closeMenu);

      // hide other lists
      $('body').trigger('click');

      window.clearTimeout(this.timer);

      this.element.addClass(CLASSNAME_OPENED);

      $('body').on('click', this.closeMenu);
   };

   private closeMenu = () => {
      this.element.removeClass(CLASSNAME_OPENED);

      this.clearEntries();

      $('body').off('click', null, this.closeMenu);
   };
}
