import { IMessage } from './Message.interface'
import { IJID } from './JID.interface'
import { Presence } from './connection/AbstractConnection'
import { EncryptionState } from './plugin/AbstractPlugin'
import ChatWindow from './ui/ChatWindow'
import Transcript from './Transcript'
import Avatar from './Avatar'

export enum ContactType {
   CHAT = 'chat',
   GROUPCHAT = 'groupchat'
}

export enum ContactSubscription {
   REMOVE = 'remove',
   FROM = 'from',
   TO = 'to',
   BOTH = 'both',
   NONE = 'none'
}

export interface IContact {
   delete();

   openChatWindow(): ChatWindow;

   getChatWindow(): ChatWindow;

   setResource(resource: string);

   setPresence(resource: string, presence: Presence);

   getCapableResources(features: string[]): Promise<Array<string>>
   getCapableResources(features: string): Promise<Array<string>>

   hasFeatureByRessource(resource: string, features: string[]): Promise<{}>
   hasFeatureByRessource(resource: string, feature: string): Promise<{}>

   getCapabilitiesByRessource(resource: string): Promise<any>;

   registerCapableResourcesHook(features: string[], cb: (resources: string[]) => void);
   registerCapableResourcesHook(features: string, cb: (resources: string[]) => void);

   getId(): string;

   getJid(): IJID;

   getResources(): Array<string>;

   getPresence(): Presence;

   getType(): ContactType;

   getNumberOfUnreadMessages(): number;

   getName(): string;

   getAvatar(): Promise<Avatar>;

   getSubscription(): ContactSubscription;

   getVcard(): Promise<{}>;

   setEncryptionState(state: EncryptionState);

   getEncryptionState(): EncryptionState;

   getTranscript(): Transcript;

   getStatus(): string;

   setStatus(status: string);

   setName(name: string);

   setSubscription(subscription: ContactSubscription);

   registerHook(property: string, func: (newValue: any, oldValue: any) => void);

   isPersistent(): boolean;
}
