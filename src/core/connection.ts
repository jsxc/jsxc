import { Strophe } from 'strophe.js';
import { setOnlineStatus } from './presence';
import { getContactsList } from './iq';
import {
  parseStanza,
  extractBareJid,
  decodeConnectionStatus,
} from './utilities';
import { ConnectionStatus, Contact, Message } from './types';

const { Connection } = Strophe;

/**
 *  Establishes a connection with an XMPP
 *  server using given credentials.
 */
export const connect = ({
  url,
  username,
  password,
  onConnectionStatusChange,
  onContactsLoaded,
  onMessageReceived,
  onRawInput,
  onRawOutput,
}: {
  url: string;
  username: string;
  password: string;
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
  onContactsLoaded?: (contacts: Contact[]) => void;
  onMessageReceived?: (message: Message) => void;
  onRawInput?: (data: string) => void;
  onRawOutput?: (data: string) => void;
}): Strophe.Connection => {
  const connection = new Connection(url);

  if (onRawInput) {
    connection.rawInput = onRawInput;
  }

  if (onRawOutput) {
    connection.rawOutput = onRawOutput;
  }

  connection.connect(username, password, async (status) => {
    /**
     *  Strophe invokes this callback whenever the connection
     *  status changes.
     */

    const connectionStatus = decodeConnectionStatus(status);
    onConnectionStatusChange?.(connectionStatus);

    if (connectionStatus === 'CONNECTED') {
      /* Retrieve contacts list */
      const contacts = await getContactsList({ connection });
      onContactsLoaded?.(contacts);

      /* Set online status */
      setOnlineStatus({ connection });

      /* Handle incoming messages */
      connection.addHandler(
        (stanza) => {
          const parsedStanza = parseStanza(stanza);

          if (parsedStanza.message.body) {
            onMessageReceived?.({
              from: extractBareJid(parsedStanza.message.attributes.from),
              to: parsedStanza.message.attributes.to,
              text: parsedStanza.message.body._text,
            });
          }

          return true;
        },
        '',
        'message',
        'chat',
        '',
        '',
      );
    }
  });

  return connection;
};

/**
 *  Gracefully severs the connection with the
 *  XMPP server.
 */
export const disconnect = ({
  connection,
}: {
  connection: Strophe.Connection;
}) => {
  connection.disconnect('');
};
