import IdentifiableInterface from './IdentifiableInterface'
import Storage from './Storage'
import ContactDialog from './ui/dialogs/contact'
import Notification from './Notification'

export const enum TYPE {
   normal, announcement, contact
}

export const enum FUNCTION {
   contactRequest,
   notificationRequest,
}
let functions = {};
functions[FUNCTION.contactRequest] = ContactDialog;
functions[FUNCTION.notificationRequest] = Notification.askForPermission;

export interface NoticeData {
   title:string;
   description:string;
   fnName: FUNCTION;
   fnParams?:Array<string>;
   type?:TYPE;
}

export class Notice implements IdentifiableInterface {

   private storage:Storage;

   private data:NoticeData;

   constructor(storage:Storage, data:NoticeData);
   constructor(storage:Storage, id:string);
   constructor() {
      this.storage = arguments[0];

      if (arguments.length === 2 && typeof arguments[1] === 'string') {
         this.data = this.storage.getItem(arguments[1]);
      } else {
         this.data = arguments[1];
         this.data.fnParams = this.data.fnParams || [];
         this.data.type = this.data.type || TYPE.normal;

         this.storage.setItem(this.getId(), this.data);
      }
   }

   public getId():string {
      return this.data.fnName + '|' + this.data.fnParams.toString();
   }

   public getTitle():string {
      return this.data.title;
   }

   public getDescription():string {
      return this.data.description;
   }

   public getFnParams():Array<string> {
      return this.data.fnParams;
   }

   public getType():TYPE {
      return this.data.type;
   }

   public callFunction() {
      return functions[this.data.fnName].apply(this, this.data.fnParams);
   }
}
