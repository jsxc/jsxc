import * as moment from 'moment'

export default class DateTime {
   public static stringify(stamp: number, elements?: JQuery) {
      let momentObject = moment(stamp);
      let fromNow = momentObject.fromNow();

      if (!elements) {
         return fromNow
      }

      elements.each(function() {
         $(this).text(fromNow);
      });

      setTimeout(function() {
         DateTime.stringify(stamp, elements);
      }, 1000 * 60);
   }
}
