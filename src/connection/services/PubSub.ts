import AbstractService from './AbstractService'
import * as NS from '../xmpp/namespace'
import Form from '@connection/Form'
import { IJID } from '@src/JID.interface'

let baseNamespace = 'http://jabber.org/protocol/pubsub';

NS.register('PUBSUB', baseNamespace);
NS.register('PUBSUB_SUBSCRIBE_OPTIONS', baseNamespace + '#subscribe_options');
NS.register('PUBSUB_ERRORS', baseNamespace + '#errors');
NS.register('PUBSUB_EVENT', baseNamespace + '#event');
NS.register('PUBSUB_OWNER', baseNamespace + '#owner');
NS.register('PUBSUB_AUTO_CREATE', baseNamespace + '#auto-create');
NS.register('PUBSUB_PUBLISH_OPTIONS', baseNamespace + '#publish-options');
NS.register('PUBSUB_NODE_CONFIG', baseNamespace + '#node_config');
NS.register('PUBSUB_CREATE_AND_CONFIGURE', baseNamespace + '#create-and-configure');
NS.register('PUBSUB_SUBSCRIBE_AUTHORIZATION', baseNamespace + '#subscribe_authorization');
NS.register('PUBSUB_GET_PENDING', baseNamespace + '#get-pending');
NS.register('PUBSUB_MANAGE_SUBSCRIPTIONS', baseNamespace + '#manage-subscriptions');
NS.register('PUBSUB_META_DATA', baseNamespace + '#meta-data');

export default class PubSub extends AbstractService {
   private jid: IJID;
   private service: string;

   public connect(jid: IJID, service: string) {
      this.jid = jid;
      this.service = service;
   }

   public createNode(node: string, options?: Form): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('create', {
         node
      });

      if (options) {
         iq.up().c('configure').cnode(options.toXML());
      }

      return this.sendIQ(iq);
   }

   public deleteNode(node: string): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB_OWNER')
      }).c('delete', {
         node
      });

      return this.sendIQ(iq);
   }

   public discoverNodes(): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('query', {
         xmlns: Strophe.NS.DISCO_ITEMS
      });

      return this.sendIQ(iq);
   }

   public getConfig(node): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB_OWNER')
      }).c('configure', {
         node
      });

      return this.sendIQ(iq);
   }

   public getDefaultNodeConfig(): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB_OWNER')
      });
      iq.c('default');

      return this.sendIQ(iq);
   }

   public subscribe(node: string, eventCallback: (stanza: string) => boolean, options?: Form, barejid: boolean = false): Promise<Element> {
      let jid = (barejid) ? this.jid.bare : this.jid.full;

      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('subscribe', {
         node,
         jid
      });

      if (options) {
         iq.up().c('options').cnode(options.toXML());
      }

      //@REVIEW probably not specific enough
      this.connection.registerHandler(eventCallback, null, 'message', null, null, null);

      return this.sendIQ(iq);
   }

   public unsubscribe(node: string, jid: IJID, subId?: string): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('unsubscribe', {
         node,
         jid: jid.full
      });

      if (subId) {
         iq.attrs({
            subid: subId
         });
      }

      return this.sendIQ(iq);
   }

   public publish(node: string, item: Strophe.Builder, options?: Form): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('publish', {
         node
      }).cnode(item.tree());

      if (options) {
         iq.up().up().c('publish-options').cnode(options.toXML());
      }

      return this.sendIQ(iq);
   }

   public getAllItems(node: string): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('items', {
         node
      });

      return this.sendIQ(iq);
   }

   public getAllItemsFrom(node: string, jid: IJID): Promise<Element> {
      let iq = $iq({
         to: jid.full,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('items', {
         node
      });

      return this.sendIQ(iq);
   }

   public getSubscriptions(): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('subscriptions');

      return this.sendIQ(iq);
   }

   public getNodeSubscriptions(node: string): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB_OWNER')
      }).c('subscriptions', {
         node
      });

      return this.sendIQ(iq);
   }

   public getSubOptions(node: string, subId?: string): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'get',
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB')
      }).c('options', {
         node,
         jid: this.jid
      });

      if (subId) {
         iq.attrs({ subid: subId });
      }

      return this.sendIQ(iq);
   }

   public getAffiliations(node?: string): Promise<Element> {
      let attrs: { node?: string } = {};
      let xmlns = { xmlns: NS.get('PUBSUB') };

      if (node) {
         attrs.node = node;
         xmlns.xmlns = NS.get('PUBSUB_OWNER');
      }

      let iq = $iq({
         to: this.service,
         type: 'get'
      });

      iq.c('pubsub', xmlns).c('affiliations', attrs);

      return this.sendIQ(iq);
   }

   public setAffiliation(node: string, jid, affiliation): Promise<Element> {
      let iq = $iq({
         to: this.service,
         type: 'set'
      }).c('pubsub', {
         xmlns: NS.get('PUBSUB_OWNER')
      }).c('affiliations', {
         node
      }).c('affiliation', {
         jid,
         affiliation
      });

      return this.sendIQ(iq);
   }
}
