import * as NS from '../namespace'
import DiscoInfo from '../../../DiscoInfo'
import JID from '../../../JID'
import Account from '../../../Account'
import Log from '../../../util/Log'
import AbstractHandler from '../AbstractHandler'

export default class CapsHandler extends AbstractHandler {

   public static NAMESPACE = 'http://jabber.org/protocol/caps';

   constructor(account: Account) {
      super(account);

      NS.register('CAPS', CapsHandler.NAMESPACE);

      account.getDiscoInfo().addFeature(NS.get('CAPS'));
   }

   public processStanza(stanza: Element) {
      let from = new JID(stanza.getAttribute('from'));
      let c = stanza.querySelector('c');
      let hash = c.getAttribute('hash');
      let version = c.getAttribute('ver');
      let node = c.getAttribute('node');

      if (!hash) {
         Log.info('Drop caps element, because hash attribute is missing.');
         return this.PRESERVE_HANDLER;
      } else if (hash !== 'sha-1') {
         Log.info('Drop caps element, because we only support sha-1.');
         return this.PRESERVE_HANDLER;

         /* @TODO
         * Send a service discovery information request to the generating entity.
         * Receive a service discovery information response from the generating entity.
         * Do not validate or globally cache the verification string as described below; instead, the processing application SHOULD associate the discovered identity+features only with the JabberID of the generating entity.
         */
      }

      let discoInfoRepository = this.account.getDiscoInfoRepository();

      if (!DiscoInfo.exists(version)) {
         discoInfoRepository.requestDiscoInfo(from, node)
            .then((discoInfo) => {
               if (version !== discoInfo.getCapsVersion()) {
                  Log.warn(`Caps version from ${from.full} doesn't match. Expected: ${discoInfo.getCapsVersion()}. Actual: ${version}.`);
               }

               discoInfoRepository.addRelation(from, discoInfo);
            })
            .catch((err) => {
               Log.warn('Something went wrong during disco retrieval: ', err)
            });
      } else {
         let discoInfo = new DiscoInfo(version);

         discoInfoRepository.addRelation(from, discoInfo);
      }

      return this.PRESERVE_HANDLER;
   }
}
