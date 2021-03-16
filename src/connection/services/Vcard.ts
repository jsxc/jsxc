import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $iq } from '../../vendor/Strophe'

NS.register('VCARD', 'vcard-temp');

type vCardData = {
   [tagName: string]: string | vCardData | vCardData[]
}

export default class Vcard extends AbstractService {
   public loadVcard(jid: IJID): Promise<vCardData> {
      return this.getVcard(jid).then(this.parseVcard);
   }

   public getVcard(jid: IJID): Promise<JQuery<XMLDocument>> {
      let iq = $iq({
         type: 'get',
         to: jid.bare
      }).c('vCard', {
         xmlns: NS.get('VCARD')
      });

      return this.sendIQ(iq).then(stanza => {

         (window as any).stanza = stanza;
         let vCard = $(stanza).find('vCard');

         if (vCard.length === 0) {
            //XML BECAUSE OF CASE SENSIVITY
            return $($.parseXML('<vCard ' + NS.get('VCARD') + '/>'));
         }

         let vCardXML: JQuery<XMLDocument> = $($.parseXML(vCard.get(0).outerHTML)).find('>vCard') as any;

         return vCardXML;
      });
   }

   public async setAvatar(jid: IJID, avatar: string, mimetype: string) {
      //first get the actual vcard to merge image into
      const vCard = await this.getVcard(jid);
      let photo = vCard.children('PHOTO');

      if (avatar && mimetype) {
         if (photo.length === 0) {
            //XML BECAUSE OF CASE SENSIVITY
            vCard.append('<PHOTO><TYPE/><BINVAL/></PHOTO>');
         }

         photo.find('TYPE').text(mimetype);
         photo.find('BINVAL').text(avatar.replace(/^.+;base64,/, ''));
      } else {
         photo.remove();
      }

      return this.sendVCard(jid, vCard);
   }

   private async sendVCard(jid: IJID, newVCard: JQuery<XMLDocument>): Promise<any> {
      let setVcardIQStanza = $iq({
         type: 'set',
         to: jid.bare
      }).cnode(newVCard.get(0));

      return this.sendIQ(setVcardIQStanza);
   }

   private parseVcard = (vCardElement: JQuery<XMLDocument>): vCardData => {
      let data: vCardData = {};

      if (!vCardElement.length) {
         return data;
      }

      data = this.parseVcardChildren(vCardElement);

      return data;
   }

   private parseVcardChildren = (stanza: JQuery<XMLDocument>): vCardData => {
      let self = this;
      let data: vCardData = {};
      let children = stanza.children();

      children.each(function() {
         let item = $(this);
         let children = item.children();
         let itemName = item.prop('tagName');
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
            src = src.replace(/[\t\r\n\f ]/gi, '');

            value = {
               type,
               src
            };
         } else if (itemName === 'EMAIL') {
            value = item.find('USERID').text();
         } else if (children.length > 0) {
            value = self.parseVcardChildren(item);
         } else {
            value = item.text().trim();
         }

         if (Array.isArray(data[itemName])) {
            (data[itemName] as vCardData[]).push(value);
         } else if (data[itemName]) {
            data[itemName] = [data[itemName], value];
         } else {
            data[itemName] = value;
         }
      });

      return data;
   }
}
