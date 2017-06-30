import {MessageInterface} from './MessageInterface'
import {JIDInterface} from './JIDInterface'
import {Presence} from './connection/AbstractConnection'

export interface ContactInterface {
   delete();

   openWindow();

   addResource(resource:string);

   removeResource(resource:string);

   setResource(resource:string);

   setPresence(resource:string, presence:Presence);

   sendMessage(message:MessageInterface);

   getId():string;

   getJid():JIDInterface;

   getFingerprint();

   getMsgState();

   getPresence();

   getType();

   getNumberOfUnreadMessages():number;

   getName():string;

   getAvatar():Promise<{}>;

   getSubscription();

   getCapabilitiesByRessource():Promise<{}>;

   getVcard():Promise<{}>;

   isEncrypted();

   getStatus():string;

   setStatus(status:string);

   setTrust(trust:boolean);

   setName(name:string);

   setSubscription(subscription:string);

   registerHook(property:string, func:(newValue:any, oldValue:any)=>void);
}
