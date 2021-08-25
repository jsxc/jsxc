import { IEndReason, OTalkEventNames } from '@vendor/Jingle.interface';
import { IContact } from './Contact.interface';

export interface IMediaSession {
   getId(): string;
   getPeer(): IContact;
   getCallType(): 'audio' | 'video' | 'stream';
   on(eventName: OTalkEventNames | 'adopt', handler: (data: any) => void): void;
   cancel(): void;
   decline(): void;
   end(reason?: string | IEndReason, silent?: boolean): void;

   onOnceIncoming(): void;
   getMediaRequest(): ('audio' | 'video')[];
   getRemoteStreams(): MediaStream[];
}
