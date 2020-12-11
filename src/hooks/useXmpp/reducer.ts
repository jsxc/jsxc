import { useReducer, Dispatch, ReducerAction } from 'react';
import produce from 'immer';
import { Action } from './actions';
import {
  isConnectAction,
  isSetConnectionStatusAction,
  isSetContactsAction,
  isSetThreadsAction,
} from './typeGuards';
import { Credentials, Connection, Data } from './types';

export type State = {
  credentials: Credentials;
  connection: Connection;
  data: Data;
};

type Reducer = (state: State, action: Action) => State;

export type DispatchAction = Dispatch<ReducerAction<Reducer>>;

const reducer: Reducer = (state, action) => {
  if (isConnectAction(action)) {
    return produce(state, (draftState) => {
      draftState.credentials = action.credentials;
    });
  }

  if (isSetConnectionStatusAction(action)) {
    return produce(state, (draftState) => {
      draftState.connection.status = action.status;
    });
  }

  if (isSetContactsAction(action)) {
    return produce(state, (draftState) => {
      draftState.data.contacts = action.contacts;
    });
  }

  if (isSetThreadsAction(action)) {
    return produce(state, (draftState) => {
      draftState.data.threads = action.threads;
    });
  }

  return state;
};

export const useXmppReducer = (
  initialState: State,
): [State, DispatchAction] => {
  return useReducer<Reducer>(reducer, initialState);
};
