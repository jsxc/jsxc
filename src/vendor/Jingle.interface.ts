type Condition = 'alternative-session' | 'busy' | 'cancel' | 'connectivity-error' | 'decline' | 'expired' | 'failed-application' | 'failed-transport' | 'general-error' | 'gone' | 'incompatible-parameters' | 'media-error' | 'security-error' | 'success' | 'timeout' | 'unsupported-applications' | 'unsupported-transports';

interface IReason {
   condition: Condition
   text: string
   alternativeSession: string
}

type State = 'starting' | 'pending' | 'active' | 'ended';
type ConnectionState = 'starting' | 'connecting' | 'connected' | 'disconnected' | 'interrupted';

interface IJingleSessionProperties {
   sid: string
   peer: string
   peerID: string
   state: State
   connectionState: ConnectionState
   isInitiator: boolean
   starting: boolean
   pending: boolean
   active: boolean
   ended: boolean
   connecting: boolean
   connected: boolean
   disconnected: boolean
   interrupted: boolean
   pc: any

   emit(eventName: OTalkEventNames, data?: any): void
   on(eventName: OTalkEventNames, cb): void
}

export interface IOTalkJingleSession extends IJingleSessionProperties {
   accept(): void
   cancel(): void
   decline(): void
   end(reason?: string | IReason, silent?: boolean): void
}

export type OTalkEventNames = 'aborted'|'peerStreamAdded'|'peerStreamRemoved'|'peerTrackAdded'|'peerTrackRemoved'|'accepted'|'ringing'|'hold'|'resumed'|'mute'|'unmute'|'addChannel'|'change:sessionState'|'change:connectionState'|'send'|'terminated'|'';

export interface IOTalkJingleMediaSession extends IJingleSessionProperties {
   start(offerOptions: {}, next: () => void): void
   accept(): void
   cancel(): void
   decline(): void
   end(reason?: string | IReason, silent?: boolean): void
   ring(): void
   mute(): void
   unmute(): void
   hold(): void
   resume(): void
   addStream(stream: MediaStream, renegotiate?: boolean, cb?: () => void): void
   removeStream(stream: MediaStream, renegotiate?: boolean, cb?: () => void): void
   switchStream(oldStream: MediaStream, newStream: MediaStream, cb?: () => void): void
}

type EndCondition = 'alternative-session' | 'busy' | 'cancel' | 'connectivity-error' | 'decline' | 'expired' | 'failed-application' | 'failed-transport' | 'general-error' | 'gone' | 'incompatible-parameters' | 'media-error' | 'security-error' | 'success' | 'timeout' | 'unsupported-applications' | 'unsupported-transports';

export interface IEndReason {
   condition: EndCondition
   text: string
   alternativeSession: string
}
