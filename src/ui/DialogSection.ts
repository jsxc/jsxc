import Navigation from './DialogNavigation'

export default abstract class Section {
   private element: JQuery;

   constructor(protected navigation: Navigation, private title?: string) {

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
         let legendElement = $('<h2>');
         legendElement.text(this.title);
         legendElement.appendTo(this.element);
      }

      this.element.append(this.generateContentElement());
   }

   protected abstract generateContentElement(): JQuery
}
