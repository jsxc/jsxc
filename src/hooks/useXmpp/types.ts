import * as core from '../../core';

export type Dictionary<T> = core.Dictionary<T>;
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
  contacts: Contact[];
  threads: Dictionary<Thread>;
};

export type Thread = Message[];
