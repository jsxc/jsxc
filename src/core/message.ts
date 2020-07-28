import { Strophe, $msg } from 'strophe.js';

/**
 *  Sends a message to a user.
 */
export const sendMessage = ({
  connection,
  from,
  to,
  text,
}: {
  connection: Strophe.Connection;
  from: string;
  to: string;
  text: string;
}): void => {
  const message = $msg({
    type: 'chat',
    from,
    to,
  })
    .c('body')
    .t(text);

  connection.send(message);
};
