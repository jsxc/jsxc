//@TODO duplicate of AbstractConnection
enum Presence {
   online,
   chat,
   away,
   xa,
   dnd,
   offline
}

export default class ContactData {
   public jid;
   public name;
   public presence:Presence = Presence.offline;
   public status:string = '';
   public subscription = 'none';
   public msgstate = 0;
   public trust:boolean = false;
   public fingerprint:string = null;
   public resources = {};
   public type = 'chat'

   constructor(data:any) {
      $.extend(this, data);
   }
}
