import Navigation from './DialogNavigation'

export default abstract class Section {
   private element: JQuery;

   constructor(protected navigation: Navigation, private title?: string, private isCollapsible: boolean = false) {
   }

   public getDOM(): JQuery {
      if (!this.element) {
         this.generateDOM();
      }

      return this.element;
   }

   private generateDOM() {
      this.element = $('<section>');

      if (this.title) {
         if (this.isCollapsible) {
            let button = $('<button>');

            button.text(this.title);
            button.addClass('jsxc-collapsible-settings-button');
            button.on('click', (ev) => {
               $(ev.target).toggleClass('jsxc-collapsible-settings-button-active');
            });

            button.appendTo(this.element);
         } else {
            let legendElement = $('<h2>');
            legendElement.text(this.title);
            legendElement.appendTo(this.element);
         }
      }

      this.element.append(this.generateContentElement());
   }

   protected abstract generateContentElement(): JQuery
}
