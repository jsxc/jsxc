import {JIDInterface} from './JIDInterface'

export enum DIRECTION {
   IN, OUT, SYS
};

export enum MSGTYPE {
   CHAT, GROUPCHAT
};

export interface MessageInterface {
   getId();

   save();

   delete();

   getCssId();

   getDOM();

   getStamp();

   getDirection():DIRECTION;

   getDirectionString():string;

   getAttachment():Attachment;

   getPeer():JIDInterface;

   getType():MSGTYPE;

   getTypeString():string;

   getHtmlMessage():string;

   getPlaintextMessage():string;

   received();

   isReceived():boolean;

   isForwarded():boolean;

   isEncrypted():boolean;

   hasAttachment():boolean;

   setUnread();

   getProcessedBody():string;

   getErrorMessage():string;
}
