import * as core from '../../core';

export type ConnectionStatus = core.ConnectionStatus;
export type Contact = core.Contact;
export type Message = core.Message;

export type Credentials = {
  url: string;
  username: string;
  password: string;
};

export type Connection = {
  status: ConnectionStatus;
};

export type Data = {
  threads: Thread[];
};

export type Thread = {
  contact: Contact;
  messages: Message[];
};
