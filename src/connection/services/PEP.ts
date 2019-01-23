import AbstractService from './AbstractService'
import { $iq } from '../../vendor/Strophe'

export default class PEP extends AbstractService {

   public subscribe(node: string, handler: (stanza: string) => boolean, force: boolean = false) {
      this.account.getDiscoInfo().addFeature(node);
      this.account.getDiscoInfo().addFeature(`${node}+notify`);

      this.connection.registerHandler(handler, 'http://jabber.org/protocol/pubsub#event', 'message', null, null, null);

      if (force) {
         return this.connection.sendPresence();
      }
   }

   public unsubscribe(node: string, force: boolean = false) {
      this.account.getDiscoInfo().removeFeature(node)
      this.account.getDiscoInfo().removeFeature(`${node}+notify`)

      if (force) {
         return this.connection.sendPresence();
      }
   }

   public publish(node: string, element: Element, id?: string): Promise<Element> {
      let iqStanza = $iq({
         type: 'set',
      }).c('pubsub', {
         xmlns: 'http://jabber.org/protocol/pubsub'
      }).c('publish', {
         node
      }).c('item', {
         id
      }).cnode(element);

      return this.sendIQ(iqStanza);
   }

   public retrieveItems(node: string, jid?: string) {
      let iq = $iq({
         to: jid,
         type: 'get'
      });

      iq.c('pubsub', {
         xmlns: 'http://jabber.org/protocol/pubsub'
      });
      iq.c('items', {
         node
      });

      return this.sendIQ(iq);
   }
}
