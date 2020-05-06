import Log from './util/Log'
import UUID from './util/UUID'
import PersistentMap from './util/PersistentMap'
import Client from './Client'
import beautifyBytes from './ui/util/ByteBeautifier'

export default class Attachment {

   private data: string;

   private file: File;

   private uid: string;

   private properties: PersistentMap;

   constructor(name: string, mimeType: string, data: string);
   constructor(file: File);
   constructor(uid: string);
   constructor() {
      if (arguments.length === 1 && typeof arguments[0] === 'string') {
         this.uid = arguments[0];
      }

      let storage = Client.getStorage();
      this.properties = new PersistentMap(storage, this.getUid());

      if (arguments[0] instanceof File) {
         this.file = arguments[0];

         this.properties.set({
            mimeType: this.file.type,
            name: this.file.name,
            size: this.file.size
         });
      } else if (arguments.length === 3) {
         this.properties.set({
            mimeType: arguments[1],
            name: arguments[0]
         });

         this.data = arguments[2];
      }

      if (this.isImage() && this.file && !this.hasThumbnailData()) {
         this.generateThumbnail();
      }
   }

   public delete() {
      this.properties.delete();
   }

   public getUid(): string {
      if (!this.uid) {
         this.uid = UUID.v4();
      }

      return this.uid;
   }

   public getData() {
      if (!this.data) {
         this.data = this.properties.get('data');
      }

      return this.data;
   }

   public setData(data: string): boolean {
      this.data = data;

      if (typeof data === 'string' && data.length < 1024) {
         this.properties.set('data', data);

         return true;
      }

      Log.warn('Data to large to store');

      return false;
   }

   public setProcessed(processed: boolean) {
      this.properties.set('processed', processed);
   }

   public isProcessed(): boolean {
      return !!this.properties.get('processed');
   }

   public getSize(): number {
      return this.properties.get('size');
   }

   public getMimeType(): string {
      return this.properties.get('mimeType');
   }

   public setThumbnailData(thumbnail: string) {
      this.properties.set('thumbnail', thumbnail);
   }

   public getThumbnailData() {
      return this.properties.get('thumbnail');
   }

   public getName() {
      return this.properties.get('name');
   }

   public setFile(file: File) {
      this.file = file;
   }

   public getFile(): File {
      return this.file;
   }

   public isPersistent(): boolean {
      return !!this.properties.get('data');
   }

   public isImage(): boolean {
      return /^image\/(jpeg|jpg|gif|png|svg)/i.test(this.getMimeType());
   }

   public hasThumbnailData(): boolean {
      return !!this.getThumbnailData();
   }

   public hasData(): boolean {
      return !!this.getData();
   }

   public clearData() {
      this.data = null;
   }

   public getElement() {
      let type = this.getMimeType();
      let name = this.getName();
      let size = beautifyBytes(this.getSize());

      let wrapperElement = $('<div>');
      wrapperElement.addClass('jsxc-attachment');
      wrapperElement.addClass('jsxc-' + type.replace(/\//, '-'));
      wrapperElement.addClass('jsxc-' + type.replace(/^([^/]+)\/.*/, '$1'));

      let title = `${name} (${size})`;

      if (FileReader && this.isImage() && this.file) {
         // show image preview
         let img = $('<img alt="preview">');
         img.attr('title', title);
         // img.attr('src', jsxc.options.get('root') + '/img/loading.gif');

         this.getDataFromFile().then((src) => {
            img.attr('src', src);
         });

         return wrapperElement.append(img);
      } else {
         return wrapperElement.text(title);
      }
   }

   private getDataFromFile(): Promise<string> {
      return new Promise((resolve, reject) => {
         let reader = new FileReader();

         reader.onload = function() {
            resolve(<string> reader.result);
         }

         reader.onerror = reject;

         reader.readAsDataURL(this.file);
      });
   }

   private generateThumbnail(): void {
      if (typeof Image === 'undefined') {
         return;
      }

      if (/^image\/svg/i.test(this.getMimeType())) {
         return;
      }

      if (!this.hasData()) {
         if (this.file) {
            this.getDataFromFile().then((data) => {
               this.data = data;

               this.generateThumbnail();
            });
         }

         return;
      }

      let sHeight;
      let sWidth;
      let sx;
      let sy;
      let dHeight = 100;
      let dWidth = 100;
      let canvas = <HTMLCanvasElement> $('<canvas>').get(0);

      canvas.width = dWidth;
      canvas.height = dHeight;

      let ctx = canvas.getContext('2d');
      let img = new Image();

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

         let thumbnailData = canvas.toDataURL('image/jpeg', 0.3);

         this.properties.set('thumbnail', thumbnailData);
      };

      img.src = this.data;
   }
}
