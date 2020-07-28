import { ConnectionStatus, Credentials, Thread } from './types';

export type Action =
  | ConnectAction
  | SetConnectionStatusAction
  | SetThreadsAction;

export type ConnectAction = {
  type: 'CONNECT';
  credentials: Credentials;
};

export type SetConnectionStatusAction = {
  type: 'SET_CONNECTION_STATUS';
  status: ConnectionStatus;
};

export type SetThreadsAction = {
  type: 'SET_THREADS';
  threads: Thread[];
};
