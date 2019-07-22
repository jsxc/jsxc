import { ILinkHandler } from './LinkHandler.interface';
import Location from '@util/Location';

export default class LinkHandlerGeo implements ILinkHandler {
   private static instance: LinkHandlerGeo;

   public static get(): LinkHandlerGeo {
      if (!LinkHandlerGeo.instance) {
         LinkHandlerGeo.instance = new LinkHandlerGeo();
      }

      return LinkHandlerGeo.instance;
   }

   public detect(element: JQuery) {
      element.find('[href^="geo:"]').each(function() {
         let uri = $(this).attr('href');
         let coords = Location.parseGeoUri(uri);
         let link = Location.locationToLink(coords.latitude, coords.longitude);
         let label = 'OSM: ' + Location.ddToDms(coords.latitude, coords.longitude);

         if (coords.accuracy) {
            label += ' (±' + (Math.round(coords.accuracy * 10) / 10) + 'm)';
         }

         $(this).attr('href', link);
         $(this).text(label);
         $(this).addClass('jsxc-geo');
      })
   }
}
