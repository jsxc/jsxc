import { Strophe } from 'strophe.js';
import { xml2js } from 'xml-js';
import { Dictionary, ConnectionStatus } from './types';

const { getBareJidFromJid, getResourceFromJid, Status } = Strophe;

/**
 *  Converts an XML stanza to a JS object.
 */
export const parseStanza = (xml: Element): Dictionary => {
  return parseXml(xml.outerHTML);
};

/**
 *  Converts an XML string to a JS object.
 */
export const parseXml = (xml: string): Dictionary => {
  return xml2js(xml, {
    compact: true,
    attributesKey: 'attributes',
  });
};

/**
 *  Removes the resource component from a full
 *  JID to get a bare JID.
 */
export const extractBareJid = (fullJid: string): string => {
  return getBareJidFromJid(fullJid);
};

/**
 *  Extracts the resource component from a full
 *  JID.
 */
export const extractResource = (fullJid: string): string => {
  return getResourceFromJid(fullJid);
};

/**
 *  Maps a Strophe connection status constant
 *  from a number to a string.
 *
 *  http://strophe.im/strophejs/doc/1.3.4/files/strophe-umd-js.html#Strophe.Connection_Status_Constants
 */
export const decodeConnectionStatus = (
  status: Strophe.Status,
): ConnectionStatus => {
  switch (status) {
    case Status.ERROR:
      return 'ERROR';
    case Status.CONNECTING:
      return 'CONNECTING';
    case Status.CONNFAIL:
      return 'CONNFAIL';
    case Status.AUTHENTICATING:
      return 'AUTHENTICATING';
    case Status.AUTHFAIL:
      return 'AUTHFAIL';
    case Status.CONNECTED:
      return 'CONNECTED';
    case Status.DISCONNECTED:
      return 'DISCONNECTED';
    case Status.DISCONNECTING:
      return 'DISCONNECTING';
    case Status.ATTACHED:
      return 'ATTACHED';
    case Status.REDIRECT:
      return 'REDIRECT';
    case Status.CONNTIMEOUT:
      return 'CONNTIMEOUT';
    default:
      return 'ERROR';
  }
};
