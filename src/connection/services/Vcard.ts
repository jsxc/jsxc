import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $iq } from '../../vendor/Strophe'

export default class Vcard extends AbstractService {
   public loadVcard(jid: IJID) {
      let iq = $iq({
         type: 'get',
         to: jid.full
      }).c('vCard', {
         xmlns: NS.get('VCARD')
      });

      //@TODO register Namespace 'VCARD', 'vcard-temp'

      return this.sendIQ(iq).then(this.parseVcard);
   }

   private parseVcard = (stanza) => {
      let data: any = {};
      let vcard = $(stanza).find('vCard');

      if (!vcard.length) {
         return data;
      }

      return this.parseVcardChildren(vcard);
   }

   private parseVcardChildren(stanza) {
      let data: any = {};
      let children = stanza.children();

      children.each(function() {
         let item = $(this);
         let children = item.children();
         let itemName = item[0].tagName;
         let value = null;

         if (itemName === 'PHOTO') {
            let img = item.find('BINVAL').text();
            let type = item.find('TYPE').text();
            let src = 'data:' + type + ';base64,' + img; //@REVIEW XSS

            //@REVIEW privacy
            if (item.find('EXTVAL').length > 0) {
               src = item.find('EXTVAL').text();
            }

            // concat chunks
            src = src.replace(/[\t\r\n\f]/gi, '');

            value = {
               type: type,
               src: src
            };
         } else if (children.length > 0) {
            value = this.parseVcardChildren(children);
         } else {
            value = item.text();
         }

         data[itemName] = value;
      });

      return data;
   }
}
