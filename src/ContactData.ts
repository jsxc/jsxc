export default class ContactData {
   public jid;
   public name;
   public status = 0;
   public subscription = 'none';
   public msgstate = 0;
   public trust:boolean = false;
   public fingerprint:string = null;
   public resources:Array<string> = [];
   public type = 'chat'

   constructor(data:any) {
      $.extend(this, data);
   }
}
