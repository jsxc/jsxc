import Options from './Options';
import Log from './util/Log';

export default class Attachment {
   private mimeType:string;

   private data:any;

   private thumbnailData:any;

   private size:number;

   private persistent:boolean;

   private name:string;

   //@TODO create constructor

   public save():boolean {
      if (this.isImage() && this.data && !this.thumbnailData) {
         this.generateThumbnail();
      }

      if (this.size > Options.get('maxStorableSize')) {
         Log.debug('Attachment to large to store');

         this.persistent = false;

         return false;

         //@TODO delete data and store thumbnailData
      }

      //@TODO save to storage
      return true;
   }

   public getSize():number {
      return this.size;
   }

   public getMimeType():string {
      return this.mimeType;
   }

   public getThumbnailData() {
      return this.thumbnailData;
   }

   public getName() {
      return this.name;
   }

   public isPersistent():boolean {
      return this.persistent;
   }

   public isImage():boolean {
      return /^image\//i.test(this.mimeType);
   }

   public hasThumbnailData():boolean {
      return !!this.thumbnailData;
   }

   public hasData():boolean {
      return !!this.data;
   }

   public clearData() {
      this.data = null;
   }

   private generateThumbnail():void {
      if(typeof Image === 'undefined') {
         return;
      }

      var sHeight, sWidth, sx, sy;
      var dHeight = 100,
         dWidth = 100;
      var canvas = <HTMLCanvasElement> $("<canvas>").get(0);

      canvas.width = dWidth;
      canvas.height = dHeight;

      var ctx = canvas.getContext("2d");
      var img = new Image();

      img.src = this.data;

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

      this.thumbnailData = canvas.toDataURL();
   }
}
