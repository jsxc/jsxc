import {
  Dictionary,
  ConnectionStatus,
  Contact,
  Credentials,
  Thread,
} from './types';

export type Action =
  | ConnectAction
  | SetConnectionStatusAction
  | SetContactsStatusAction
  | SetThreadsAction;

export type ConnectAction = {
  type: 'CONNECT';
  credentials: Credentials;
};

export type SetConnectionStatusAction = {
  type: 'SET_CONNECTION_STATUS';
  status: ConnectionStatus;
};

export type SetContactsStatusAction = {
  type: 'SET_CONTACTS';
  contacts: Contact[];
};

export type SetThreadsAction = {
  type: 'SET_THREADS';
  threads: Dictionary<Thread>;
};
