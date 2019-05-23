import * as getRGB from 'consistent-color-generation'

export default class Color {
   public static generate(text: string /*, saturation: number = 90, lightness: number = 65*/) {
      // let hash = Hash.String(text);

      // let hue = Math.abs(hash) % 360;
      // let hsl = 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';

      let color = getRGB(text);
      let r = Math.round(color.r * 255);
      let g = Math.round(color.g * 255);
      let b = Math.round(color.b * 255);

      return `rgb(${r}, ${g}, ${b})`;
   }
}
