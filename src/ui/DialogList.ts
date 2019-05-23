import ListItem from './DialogListItem'

export default class List {
   private element: JQuery;

   constructor() {
      this.element = $('<ul>');
   }

   public prepend(listItem: ListItem) {
      this.element.prepend(listItem.getDOM());
   }

   public append(listItem: ListItem) {
      this.element.append(listItem.getDOM());
   }

   public getDOM(): JQuery {
      return this.element;
   }
}
