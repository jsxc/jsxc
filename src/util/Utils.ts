
export default class Utils {
   public static removeHTML(text: string): string {
      return $('<span>').html(text).text();
   }

   public static escapeHTML(text: string): string {
      text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   }

   public static diffArray(newArray: any[], oldArray: any[]): { newValues: any[], deletedValues: any[] } {
      newArray = newArray || [];
      oldArray = oldArray || [];

      return {
         newValues: newArray.filter(id => (oldArray).indexOf(id) < 0),
         deletedValues: oldArray.filter(id => newArray.indexOf(id) < 0),
      }
   }
}
