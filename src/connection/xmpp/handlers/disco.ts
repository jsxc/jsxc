import * as NS from '../namespace'
import AbstractHandler from '../AbstractHandler'
import { $iq } from '../../../vendor/Strophe'

export class DiscoInfoHandler extends AbstractHandler {
   constructor(account) {
      super(account);

      account.getDiscoInfo().addFeature(NS.get('DISCO_INFO'));
   }

   public processStanza(stanza: Element): boolean {
      let id = stanza.getAttribute('id');
      let from = stanza.getAttribute('from');
      let node = stanza.getElementsByTagName('query')[0].getAttribute('node');

      let iq = $iq({
         type: 'result',
         id,
         to: from
      }).c('query', {
         xmlns: NS.get('DISCO_INFO'),
         node: (node) ? node : undefined
      });

      iq = this.addIdentitiesToStanza(iq);
      iq = this.addFeaturesToStanza(iq);

      (<any> this.account.getConnection()).send(iq.tree()); //@REVIEW

      return true;
   }

   private addIdentitiesToStanza(iq) {
      for (let identity of this.account.getDiscoInfo().getIdentities()) {
         let attrs = {
            'category': identity.category,
            'type': identity.type,
            'name': (identity.name) ? identity.name : null,
            'xml:lang': (identity.lang) ? identity.lang : null
         };

         iq.c('identity', attrs).up();
      }

      return iq;
   }

   private addFeaturesToStanza(iq) {
      for (let feature of this.account.getDiscoInfo().getFeatures()) {
         iq.c('feature', {
            var: feature
         }).up();
      }

      return iq;
   }
}

export class DiscoItemsHandler extends AbstractHandler {
   public processStanza(stanza: Element): boolean {
      let id = stanza.getAttribute('id');
      let from = stanza.getAttribute('from');
      let node = stanza.getElementsByTagName('query')[0].getAttribute('node');

      let iq = $iq({
         type: 'result',
         id,
         to: from
      }).c('query', {
         xmlns: NS.get('DISCO_ITEMS'),
         node: (node) ? node : undefined
      });

      //We return an empty set, because we dont support disco items

      (<any> this.account.getConnection()).send(iq.tree());

      return true;
   }
}
