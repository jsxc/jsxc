import Client from '@src/Client';
import { REGEX } from '@src/CONST';

export default class Location {
   public static geocodeErrorCount: number = 0;
   public static MAX_ERROR_GEOCODE: number = 5;
   public static GEOCODE_THRESHOLD: number = 50;

   public static getCurrentLocation(): Promise<{
      coords: { latitude: number; longitude: number; accuracy: number };
   }> {
      return new Promise((resolve, reject) => {
         navigator.geolocation.getCurrentPosition(
            position => resolve(position),
            error => reject(error)
         );
      });
   }

   public static async getCurrentLocationAsGeoUri(): Promise<string> {
      let { coords } = await Location.getCurrentLocation();

      return `geo:${coords.latitude},${coords.longitude};u=${coords.accuracy}`;
   }

   public static getCurrentLocationAsLink(zoom: number = 16) {
      return Location.getCurrentLocation().then(({ coords }) => {
         return Location.locationToLink(coords.latitude, coords.longitude, zoom);
      });
   }

   public static reverseGeocodeLocation(
      latitude: number,
      longitude: number
   ): Promise<{ street: string; nr: string; zip: string; city: string; country: string }> {
      return new Promise((resolve, reject) => {
         let nominatimurl = Client.getOption('nominatimurl') || false;
         if (!nominatimurl) {
            reject('Nominatim Url not set!');
            return;
         }

         nominatimurl += '/reverse';
         let params = $.param({ addressdetails: 1, zoom: 18, format: 'xml', lat: latitude, lon: longitude });

         $.ajax({
            type: 'GET',
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            crossDomain: true,
            cache: false,
            data: params,
            url: nominatimurl,
            error(request: any, textStatus: any, errorThrown: any) {
               Location.geocodeErrorCount++;
               if (Location.geocodeErrorCount > Location.MAX_ERROR_GEOCODE) {
                  Client.setOption('enableGeocode', false);
                  //console.error(`Disable geocoding! Errorcount > ${Location.MAX_ERROR_GEOCODE}`,textStatus,errorThrown);
               }
               reject(request.responseText ? request.responseText : errorThrown);
            },
         }).done(function (data, textStatus, xhr) {
            try {
               Location.geocodeErrorCount = 0;
               if ($(data).find('error').length > 0) {
                  reject($(data).find('error').text());
                  return;
               }

               let result: any;
               result = {
                  street: $(data).find('addressparts').find('road').text(),
                  nr: $(data).find('addressparts').find('house_number').text(),
                  zip: $(data).find('addressparts').find('postcode').text(),
                  city: $(data).find('addressparts').find('city').text(),
                  country: $(data).find('addressparts').find('country').text(),
               };

               resolve(result);
            } catch (e) {
               Location.geocodeErrorCount++;

               if (Location.geocodeErrorCount > Location.MAX_ERROR_GEOCODE) {
                  Client.setOption('enableGeocode', false);
                  //console.error(`Disable geocoding! Errorcount > ${Location.MAX_ERROR_GEOCODE}`,e);
               }
               reject(e);
            }
         });
      });
   }

   public static distanceBetweenCoordinates(
      latitude1: number,
      longitude1: number,
      latitude2: number,
      longitude2: number
   ): number {
      let pi80 = Math.PI / 180;
      latitude1 *= pi80;
      longitude1 *= pi80;
      latitude2 *= pi80;
      longitude2 *= pi80;
      let r = 6372.797;
      let dlat = longitude2 - latitude1;
      let dlng = latitude2 - longitude1;
      let a =
         Math.sin(dlat / 2) * Math.sin(dlat / 2) +
         Math.cos(latitude1) * Math.cos(longitude2) * Math.sin(dlng / 2) * Math.sin(dlng / 2);
      let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      let km = r * c;
      let m = km * 1000;
      return Math.round(m);
   }

   public static locationToLink(latitude: number, longitude: number, zoom: number = 16) {
      return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`;
   }

   public static parseGeoUri(uri: string) {
      let matches = uri.match(new RegExp(REGEX.GEOURI, ''));
      let latitude = matches[1] && parseFloat(matches[1]);
      let longitude = matches[2] && parseFloat(matches[2]);
      let accuracy = matches[3] && parseFloat(matches[3]);

      return {
         latitude,
         longitude,
         accuracy,
      };
   }

   public static ddToDms(latitude: number, longitude: number): string {
      let latDms = Location.decimalToDms(latitude);
      let lonDms = Location.decimalToDms(longitude);
      let latPostfix = latitude > 0 ? 'N' : 'S';
      let lonPostfix = longitude > 0 ? 'E' : 'W';

      return latDms + latPostfix + ' ' + lonDms + lonPostfix;
   }

   private static decimalToDms(deg: number): string {
      let d = Math.floor(deg);
      let minFloat = (deg - d) * 60;
      let m = Math.floor(minFloat);
      let secFloat = (minFloat - m) * 60;
      let s = Math.round(secFloat * 10) / 10;

      if (s === 60) {
         m++;
         s = 0;
      }

      if (m === 60) {
         d++;
         m = 0;
      }

      return `${d}°${m}'${s}"`;
   }
}
