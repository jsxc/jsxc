import Navigation from './DialogNavigation'

export default abstract class Page {
   private element: JQuery;

   constructor(protected navigation: Navigation, private title: string) {

   }

   public getDOM(): JQuery {
      if (!this.element) {
         this.generateDOM();
      }

      return this.element;
   }

   private generateDOM() {
      this.element = $('<div>');
      this.element.addClass('jsxc-page');

      let legendElement = $('<h1>');
      legendElement.addClass('jsxc-page__headline')
      legendElement.text(this.title);

      if (this.navigation.canGoBack()) {
         legendElement.addClass('jsxc-clickable'); //@REVIEW
         legendElement.on('click', () => {
            this.navigation.goBack();
         });
      }

      legendElement.appendTo(this.element);

      this.element.append(this.generateContentElement());
   }

   protected abstract generateContentElement(): JQuery | JQuery[]
}
