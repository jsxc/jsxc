import IIdentifiable from './Identifiable.interface'
import Storage from './Storage'
import ContactDialog from './ui/dialogs/contact'
import MultiUserInvitationDialog from './ui/dialogs/multiUserInvitation'
import NotificationDialog from './ui/dialogs/notification'
import UnknownSenderDialog from './ui/dialogs/unknownSender'
import Notification from './Notification'

export enum TYPE {
   normal, announcement, contact, invitation
}

export const enum FUNCTION {
   contactRequest,
   notificationRequest,
   multiUserInvitation,
   notification,
   unknownSender,
}
let functions = {};
functions[FUNCTION.contactRequest] = ContactDialog;
functions[FUNCTION.notificationRequest] = Notification.askForPermission;
functions[FUNCTION.multiUserInvitation] = MultiUserInvitationDialog;
functions[FUNCTION.notification] = NotificationDialog;
functions[FUNCTION.unknownSender] = UnknownSenderDialog;

export interface INoticeData {
   title: string;
   description: string;
   fnName: FUNCTION;
   fnParams?: string[];
   type?: TYPE;
}

export class Notice implements IIdentifiable {

   private storage: Storage;

   private data: INoticeData;

   constructor(storage: Storage, data: INoticeData);
   constructor(storage: Storage, id: string);
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

   public getId(): string {
      return this.data.fnName + '|' + this.data.fnParams.toString();
   }

   public getTitle(): string {
      return this.data.title;
   }

   public getDescription(): string {
      return this.data.description;
   }

   public getFnParams(): string[] {
      return this.data.fnParams;
   }

   public getType(): TYPE {
      return this.data.type;
   }

   public callFunction() {
      return functions[this.data.fnName].apply(this, this.data.fnParams);
   }
}
