import { Strophe, $pres } from 'strophe.js';

/**
 *  Sets the viewer's online status.
 */
export const setOnlineStatus = ({
  connection,
}: {
  connection: Strophe.Connection;
}): void => {
  connection.send($pres().tree());
};
