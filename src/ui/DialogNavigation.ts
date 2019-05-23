import Page from './DialogPage'

export default class Navigation {
   private history: JQuery[] = [];

   constructor(private rootElement: JQuery) {

   }

   public goBack() {
      if (this.history.length === 1) {
         return;
      }

      this.history.shift().remove();
      this.history[0].appendTo(this.rootElement);
   }

   public goTo(page: Page) {
      let currentPage = this.history[0];

      if (currentPage) {
         currentPage.detach();
      }

      this.history.unshift(page.getDOM());
      this.history[0].appendTo(this.rootElement);
   }

   public canGoBack(): boolean {
      return this.history.length > 0;
   }
}
