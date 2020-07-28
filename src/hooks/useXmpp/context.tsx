import React, { useRef, useEffect, useContext, createContext } from 'react';
import consola from 'consola';
import { useXmppReducer, State, DispatchAction } from './reducer';
import * as core from '../../core';
import { match } from '../../utilities';
import { ConnectionStatus, Contact } from './types';

type ProviderProps = {
  log?: boolean;
};

const XmppContext = createContext<[State, DispatchAction]>([
  {
    credentials: {
      url: '',
      username: '',
      password: '',
    },
    connection: {
      status: 'DISCONNECTED',
    },
    data: {
      threads: [],
    },
  },
  () => {},
]);

export const XmppProvider: React.FC<ProviderProps> = (props) => {
  const { children, log = true } = props;

  const connectionRef = useRef<Strophe.Connection>();

  const [state, dispatch] = useXmppReducer({
    credentials: {
      url: '',
      username: '',
      password: '',
    },
    connection: {
      status: 'DISCONNECTED',
    },
    data: {
      threads: [],
    },
  });

  const { credentials } = state;

  useEffect(() => {
    const { url, username, password } = credentials;

    const handleConnectionStatusChange = (status: ConnectionStatus) => {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        status,
      });

      if (log) {
        const loggingFunction = match(status)
          .with('CONNECTED', () => consola.success)
          .with('AUTHFAIL', () => consola.warn)
          .otherwise(() => consola.info);

        loggingFunction('Connection status changed to:', status);
      }
    };

    const handleContactsLoaded = (contacts: Contact[]) => {
      const threads = contacts.map((contact) => ({
        contact,
        messages: [],
      }));

      dispatch({
        type: 'SET_THREADS',
        threads,
      });

      if (log) {
        consola.info('Contacts loaded:', contacts.length);
      }
    };

    const handleRawInput = log
      ? (data: any) => {
          consola.debug('Raw input:', data);
        }
      : undefined;

    const handleRawOutput = log
      ? (data: any) => {
          consola.debug('Raw output:', data);
        }
      : undefined;

    if (url && username && password) {
      connectionRef.current = core.connect({
        url,
        username,
        password,
        onConnectionStatusChange: handleConnectionStatusChange,
        onContactsLoaded: handleContactsLoaded,
        onRawInput: handleRawInput,
        onRawOutput: handleRawOutput,
      });
    }

    return () => {
      if (connectionRef.current) {
        core.disconnect({ connection: connectionRef.current });
      }
    };
  }, [log, credentials, dispatch]);

  return (
    <XmppContext.Provider value={[state, dispatch]}>
      {children}
    </XmppContext.Provider>
  );
};

export const useXmpp = (): [State, DispatchAction] => {
  return useContext<[State, DispatchAction]>(XmppContext);
};
