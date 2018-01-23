import JID from './JID'
import Attachment from './Attachment'
import { ContactType } from './ContactInterface'

export enum DIRECTION {
   IN, OUT, SYS
};

export interface MessageInterface {
   registerHook(property: string, func: (newValue: any, oldValue: any) => void)

   getUid(): string

   getAttrId(): string

   delete()

   getNextId(): string

   setNext(message: MessageInterface | string): void

   getCssId(): string

   getDOM(): JQuery<HTMLElement>

   getStamp(): Date

   getDirection(): DIRECTION

   getDirectionString(): string

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

   getSender(): { name: string, jid?: JID }

   received();

   isReceived(): boolean;

   isForwarded(): boolean;

   isEncrypted(): boolean;

   hasAttachment(): boolean;

   setDirection(direction: DIRECTION)

   setPlaintextMessage(plaintextMessage: string)

   setEncryptedPlaintextMessage(encryptedPlaintextMessage: string)

   setEncrypted(encrypted: boolean)

   getProcessedBody(): string

   getErrorMessage(): string

   updateProgress(transfered: number, complete: number)
}
