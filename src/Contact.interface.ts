import { IMessage } from './Message.interface'
import { IJID } from './JID.interface'
import { Presence } from './connection/AbstractConnection'
import { EncryptionState } from './plugin/AbstractPlugin'
import ChatWindowController from './ChatWindowController'
import Transcript from './Transcript'
import Avatar from './Avatar'
import ChatWindow from '@ui/ChatWindow';
import ContactProvider from './ContactProvider';
import Account from './Account';
import DiscoInfo from './DiscoInfo';

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

   getChatWindow(): ChatWindow;

   getChatWindowController(): ChatWindowController;

   getAccount(): Account;

   addSystemMessage(messageString: string): IMessage;

   clearResources();

   setResource(resource: string);

   setPresence(resource: string, presence: Presence);

   getCapableResources(features: string[]): Promise<string[]>
   getCapableResources(features: string): Promise<string[]>

   hasFeatureByResource(resource: string, features: string[]): Promise<{}>
   hasFeatureByResource(resource: string, feature: string): Promise<{}>

   getCapabilitiesByResource(resource: string): Promise<DiscoInfo | void>;

   registerCapableResourcesHook(features: string[], cb: (resources: string[]) => void);
   registerCapableResourcesHook(features: string, cb: (resources: string[]) => void);

   getId(): string;

   getUid(): string;

   getJid(): IJID;

   getResources(): string[];

   getPresence(resource?: string): Presence;

   getType(): ContactType;

   isGroupChat(): boolean;

   isChat(): boolean;

   getNumberOfUnreadMessages(): number;

   hasName(): boolean;

   getName(): string;

   getProviderId(): string;

   getAvatar(): Promise<Avatar>;

   getSubscription(): ContactSubscription;

   getVcard(): Promise<{}>;

   setEncryptionState(state: EncryptionState, source: string);

   getEncryptionState(): EncryptionState;

   getEncryptionPluginId(): string | null;

   isEncrypted(): boolean;

   getTranscript(): Transcript;

   getStatus(): string;

   setStatus(status: string);

   setName(name: string);

   setProvider(provider: ContactProvider);

   setSubscription(subscription: ContactSubscription);

   setGroups(groups: string[]);

   getGroups(): string[];

   getLastMessageDate(): Date;

   setLastMessageDate(lastMessage: Date): void;

   registerHook(property: string, func: (newValue: any, oldValue: any) => void);

   isPersistent(): boolean;
}
