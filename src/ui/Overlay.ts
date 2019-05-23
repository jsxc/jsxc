
export default class Overlay {
   private element;

   constructor() {
      this.element = $('<div>');
      this.element.addClass('jsxc-overlay jsxc-overlay-black');
   }

   public open() {
      this.element.appendTo('body');
   }

   public close() {
      this.element.remove();
   }
}
