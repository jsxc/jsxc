import { REGEX } from '@src/CONST';

export default class Location {
   public static getCurrentLocation(): Promise<{coords: {latitude: number, longitude: number, accuracy: number}}> {
      return new Promise((resolve, reject) => {
         navigator.geolocation.getCurrentPosition(position => resolve(position), error => reject(error));
      })
   }

   public static async getCurrentLocationAsGeoUri(): Promise<string> {
      let {coords} = await Location.getCurrentLocation();

      return `geo:${coords.latitude},${coords.longitude};u=${coords.accuracy}`;
   }

   public static getCurrentLocationAsLink(zoom: number = 16) {
      return Location.getCurrentLocation().then(({ coords }) => {
         return Location.locationToLink(coords.latitude, coords.longitude, zoom);
      });
   }

   public static locationToLink(latitude: number, longitude: number, zoom: number = 16) {
      return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=${zoom}`
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
