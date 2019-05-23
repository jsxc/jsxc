import Log from '@util/Log';

export default class TableElement {
   private tableElement = $('<table>');

   constructor(private numberOfColumns: number) {

   }

   public appendRow(...columns) {
      return this.addRow('appendTo', columns);
   }

   public prependRow(...columns) {
      return this.addRow('prependTo', columns);
   }

   public get() {
      return this.tableElement;
   }

   private addRow(position: 'appendTo' | 'prependTo', columns) {
      if (columns.length !== this.numberOfColumns) {
         Log.warn('Wrong number of columns');

         return false;
      }

      let rowElement = $('<tr>');

      for (let column of columns) {
         let cellElement = $('<td>');

         cellElement.text(column);

         cellElement.appendTo(rowElement);
      }

      rowElement[position](this.tableElement);
   }
}
