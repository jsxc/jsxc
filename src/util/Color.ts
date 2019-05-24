import * as getRGB from 'consistent-color-generation'

export default class Color {
   public static generate(text: string, correction?: 'redgreen' | 'blue', saturation?: number, lightness?: number) {
      let color = getRGB(text, correction, saturation, lightness);
      let r = Math.round(color.r * 255);
      let g = Math.round(color.g * 255);
      let b = Math.round(color.b * 255);

      return `rgb(${r}, ${g}, ${b})`;
   }
}
