
export default class ImageHelper {
   public static scaleDown(data: string, quality: number = 0.3, size: number = 100): Promise<string> {
      let sHeight: number;
      let sWidth: number;
      let sx: number;
      let sy: number;
      let dHeight = size;
      let dWidth = size;
      let canvas = <HTMLCanvasElement>$('<canvas>').get(0);

      canvas.width = dWidth;
      canvas.height = dHeight;

      let ctx = canvas.getContext('2d');
      let img = new Image();

      return new Promise((resolve, reject) => {
         img.onload = () => {
            if (img.height > img.width) {
               sHeight = img.width;
               sWidth = img.width;
               sx = 0;
               sy = (img.height - img.width) / 2;
            } else {
               sHeight = img.height;
               sWidth = img.height;
               sx = (img.width - img.height) / 2;
               sy = 0;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, dWidth, dHeight);

            let thumbnailData = canvas.toDataURL('image/jpeg', quality);

            resolve(thumbnailData);
         };

         img.onerror = () => {
            reject(new Error('Could not load image'));
         }

         img.src = data;
      });
   }
}
