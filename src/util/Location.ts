
export default class Location {
   public static getCurrentLocation(): Promise<any> {
      return new Promise((resolve, reject) => {
         navigator.geolocation.getCurrentPosition(position => resolve(position), error => reject(error));
      })
   }

   public static getCurrentLocationAsLink(zoom: number = 16) {
      return Location.getCurrentLocation().then(({ coords }) => {
         return `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}&zoom=${zoom}`
      });
   }
}
