import { IConnection } from '@connection/Connection.interface';
import Account from '@src/Account';

type Send = (stanzaElement: Element | Strophe.Builder) => void;
type SendIQ = (stanzaElement: Element | Strophe.Builder) => Promise<Element>;

export default abstract class AbstractService {
   constructor(protected send: Send, protected sendIQ: SendIQ,
               protected connection: IConnection, protected account: Account) {

   }
}
