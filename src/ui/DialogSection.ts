import Navigation from './DialogNavigation';

export default abstract class Section {
   private element: JQuery;

   constructor(protected navigation: Navigation, private title?: string, private isCollapsible: boolean = false) {}

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
            button.addClass('jsxc-page__subheadline');
            button.on('click', ev => {
               $(ev.target).toggleClass('jsxc-show-sibling');
            });

            button.appendTo(this.element);
         } else {
            let legendElement = $('<h2>');
            legendElement.addClass('jsxc-page__subheadline');
            legendElement.text(this.title);
            legendElement.appendTo(this.element);
         }
      }

      let bodyElement = $('<div>');
      bodyElement.addClass('jsxc-section__body');
      bodyElement.append(this.generateContentElement());

      this.element.append(bodyElement);
   }

   protected abstract generateContentElement(): JQuery;
}
