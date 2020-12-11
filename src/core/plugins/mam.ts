import { extractBareJid, parseStanza } from '../utilities';
import { Contact, Message } from '../types';

/**
 *  Fetches the latest archived messages
 *  between the viewer and multiple contacts.
 */
export const loadArchivedMessages = async ({
  connection,
  contacts,
}: {
  connection: Strophe.Connection;
  contacts: Contact[];
}): Promise<Message[]> => {
  const messages = await Promise.all(
    contacts.map((contact) => {
      return loadArchivedMessagesWithContact({
        connection,
        contact,
      });
    }),
  );

  return messages.flat();
};

/**
 *  Fetches the latest archived messages
 *  between the viewer and a contact of his.
 */
const loadArchivedMessagesWithContact = ({
  connection,
  contact,
}: {
  connection: Strophe.Connection;
  contact: Contact;
}): Promise<Message[]> => {
  return new Promise((resolve) => {
    const bareJid = extractBareJid(connection.jid);

    let messageStanzas: Element[] = [];

    (connection as any).mam.query(bareJid, {
      with: contact.jid,
      before: '',
      max: 50,
      onMessage: (messageStanza: Element) => {
        messageStanzas = messageStanzas.concat(messageStanza);

        return true;
      },
      onComplete: () => {
        const messages = messageStanzas
          .map(parseMessageStanza)
          .filter(isFullyFledgedMessage);

        return resolve(messages);
      },
    });
  });
};

const parseMessageStanza = (messageStanza: Element): Message => {
  const parsedStanza = parseStanza(messageStanza);

  const { from, to, text } = {
    from: parsedStanza.message?.result?.forwarded?.message?.attributes?.from,
    to: parsedStanza.message?.result?.forwarded?.message?.attributes?.to,
    text: parsedStanza.message?.result?.forwarded?.message?.body?._text,
  };

  return {
    from: extractBareJid(from),
    to: extractBareJid(to),
    text,
  };
};

const isFullyFledgedMessage = (message: Message): boolean => {
  const { from, to, text } = message;

  return Boolean(from) && Boolean(to) && Boolean(text);
};
