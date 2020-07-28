import { Strophe } from 'strophe.js';
import { parseStanza } from './utilities';
import { Dictionary, Contact } from './types';

/**
 *  Fetches the viewer's roster.
 */
export const getContactsList = async ({
  connection,
}: {
  connection: Strophe.Connection;
}): Promise<Contact[]> => {
  const query = $iq({
    type: 'get',
  }).c('query', {
    xmlns: Strophe.NS.ROSTER,
  });

  const response = await sendQuery({ connection, query });

  /* TODO: Handle 0 contacts */
  /* TODO: Handle 1 contact */

  return response.iq.query.item.map(
    (element: Dictionary) => element.attributes,
  );
};

/**
 *  Sends an info query.
 */
const sendQuery = ({
  connection,
  query,
}: {
  connection: Strophe.Connection;
  query: Strophe.Builder;
}): Promise<Dictionary> => {
  return new Promise((resolve) => {
    connection.sendIQ(query, (stanza) => {
      return resolve(parseStanza(stanza));
    });
  });
};
