import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $iq } from '../../vendor/Strophe'

export default class Disco extends AbstractService {
   public getDiscoInfo(jid: IJID, node?: string): Promise<Element> {
      let attrs = {
         xmlns: NS.get('DISCO_INFO'),
         node: null
      };

      if (typeof node === 'string' && node.length > 0) {
         attrs.node = node;
      }

      let iq = $iq({
         to: jid.full,
         type: 'get'
      }).c('query', attrs);

      return this.sendIQ(iq);
   }

   public getDiscoItems(jid: IJID, node?: string): Promise<Element> {
      let attrs = {
         xmlns: NS.get('DISCO_ITEMS'),
         node: null
      };

      if (typeof node === 'string' && node.length > 0) {
         attrs.node = node;
      }

      let iq = $iq({
         to: jid.full,
         type: 'get'
      }).c('query', attrs);

      return this.sendIQ(iq);
   }
}
