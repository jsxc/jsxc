
export default class ListItem {
   private element: JQuery;

   constructor(private primaryText: string, private secondaryText?: string, private onClickHandler?, private avatar?: JQuery, private secondaryAction?: JQuery) {

   }

   public getDOM(): JQuery {
      if (!this.element) {
         this.generateDOM();
      }

      return this.element;
   }

   private generateDOM() {
      this.element = $('<li>');
      this.element.addClass('jsxc-list-item');

      if (typeof this.onClickHandler === 'function') {
         this.element.addClass('jsxc-list-item-clickable');
         this.element.on('click', () => this.onClickHandler());
      }

      if (this.avatar) {
         this.avatar.addClass('jsxc-list-item-avatar');
         this.element.append(this.avatar);
      }

      let textElement = $('<div>');
      textElement.addClass('jsxc-list-item-text');
      textElement.appendTo(this.element);

      $('<div>').text(this.primaryText).addClass('jsxc-list-item-primary-text').appendTo(textElement);

      if (this.secondaryText) {
         $('<div>').text(this.secondaryText).addClass('jsxc-list-item-secondary-text').appendTo(textElement);
      }

      if (this.secondaryAction) {
         this.secondaryAction.addClass('jsxc-list-item-secondary-action');
         this.element.append(this.secondaryAction);
      }
   }
}
