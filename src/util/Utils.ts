
export default class Utils {
   static removeHTML(text: string): string {
      return $('<span>').html(text).text();
   }

   static escapeHTML(text: string): string {
      text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
   }
}
