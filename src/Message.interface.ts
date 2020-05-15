import { IJID as JID } from './JID.interface'
import Attachment from './Attachment'
import { ContactType } from './Contact.interface'

export enum DIRECTION {
   IN, OUT, SYS, PROBABLY_OUT, PROBABLY_IN
};

export enum MessageMark {
   aborted,
   pending,
   transferred,
   received,
   displayed,
   acknowledged
};

export interface IMessagePayload {
   peer: JID,
   direction: DIRECTION,
   attrId?: string,
   uid?: string,
   plaintextMessage?: string,
   htmlMessage?: string,
   errorMessage?: string,
   attachment?: Attachment,
   mark?: MessageMark,
   encrypted?: boolean,
   forwarded?: boolean,
   stamp?: number,
   type?: ContactType,
   unread?: boolean,
   encryptedHtmlMessage?: string,
   encryptedPlaintextMessage?: string,
   sender?: {
      name: string,
      jid?: JID
   },
   chatMarkersReceived?: boolean,
   chatMarkersDisplayed?: boolean
   chatMarkersAcknowledged?: boolean
}

export interface IMessage {

   registerHook(property: string, func: (newValue: any, oldValue: any) => void)

   getUid(): string

   getAttrId(): string

   delete()

   getNextId(): string

   setNext(message: IMessage | string): void

   getCssId(): string

   getDOM(): JQuery<HTMLElement>

   getStamp(): Date

   getDirection(): DIRECTION

   getDirectionString(): string

   isSystem(): boolean

   isIncoming(): boolean

   isOutgoing(): boolean

   getAttachment(): Attachment

   setAttachment(attachment: Attachment)

   getPeer(): JID

   getType(): ContactType;

   getTypeString(): string;

   getHtmlMessage(): string;

   setHtmlMessage(htmlMessage: string)

   getEncryptedHtmlMessage(): string

   getPlaintextMessage(): string;

   getEncryptedPlaintextMessage(): string

   getPlaintextEmoticonMessage(): string

   getSender(): { name: string, jid?: JID }

   getMark(): MessageMark

   aborted();

   isAborted(): boolean;

   transferred();

   isTransferred(): boolean;

   received();

   isReceived(): boolean;

   displayed();

   isDisplayed(): boolean;

   acknowledged();

   isAcknowledged(): boolean;

   isForwarded(): boolean;

   isEncrypted(): boolean;

   hasAttachment(): boolean;

   isUnread(): boolean;

   read();

   setDirection(direction: DIRECTION)

   setPlaintextMessage(plaintextMessage: string)

   setEncryptedPlaintextMessage(encryptedPlaintextMessage: string)

   setEncrypted(encrypted: boolean)

   getProcessedBody(): Promise<string>

   setErrorMessage(error: string)

   getErrorMessage(): string

   updateProgress(transferred: number, complete: number)
}
