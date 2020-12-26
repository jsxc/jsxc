import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $iq } from '../../vendor/Strophe'
import Translation from '@util/Translation';

NS.register('VCARD', 'vcard-temp');

export default class Vcard extends AbstractService {
   public loadVcard(jid: IJID) {
      let iq = $iq({
         type: 'get',
         to: jid.bare
      }).c('vCard', {
         xmlns: NS.get('VCARD')
      });

      return this.sendIQ(iq).then(this.parseVcard);
   }

   private parseVcard = (stanza) => {
      let data: any = {};
      let vcard = $(stanza).find('vCard');

      if (!vcard.length) {
         return data;
      }

      let parser = new DOMParser();
      let srcDOM = parser.parseFromString(vcard[0].outerHTML, 'application/xml');
      let result = this.getAllChildren(this.filterEmpty(this.xml2json(srcDOM)));

      let photo = (<any>result).PHOTO;
      photo.src='data:' + photo.TYPE + ';base64,' + photo.BINVAL;
      if (photo.EXTVAL) {
          photo.src=photo.EXTVAL;
          delete photo.EXTVAL;
      }
      photo.src = photo.src.replace(/[\t\r\n\f]/gi, '');

      if ((<any>result).EMAIL.USERID)
      {
          let email = (<any>result).EMAIL.USERID;
          (<any>result).EMAIL=email;
          delete (<any>result).EMAIL.USERID;
      }

      return result;
   }

   private getAllChildren (obj) {
       if (obj!==undefined && obj.vCard!==undefined)
       {
            let result = {};
            for (let k in obj.vCard)
            {
                result[k]=(obj.vCard[k]);
            }

            return result;
       }
       else
           throw Error(Translation.t('Sorry_your_buddy_doesnt_provide_any_information'));
    }

   private filterEmpty(obj)
   {
     for (let k in obj) {
        if (typeof obj[k] === 'object') {
          this.filterEmpty(obj[k]);
        } else {
          if (obj[k] === null || obj[k] === undefined || obj[k] === '') {
              delete obj[k];
            }
        }
      }

      return obj;
   }

   private xml2json(srcDOM) {
      let children = [...srcDOM.children];

      // base case for recursion.
      if (!children.length) {
        return srcDOM.innerHTML
      }

      // initializing object to be returned.
      let jsonResult = {};

      for (let child of children) {

        // checking is child has siblings of same name.
        let childIsArray = children.filter(eachChild => eachChild.nodeName === child.nodeName).length > 1;

        // if child is array, save the values as array, else as strings.
        if (childIsArray) {
          if (jsonResult[child.nodeName] === undefined) {
            jsonResult[child.nodeName] = [this.xml2json(child)];
          } else {
            jsonResult[child.nodeName].push(this.xml2json(child));
          }
        } else {
          jsonResult[child.nodeName] = this.xml2json(child);
        }
      }

      return jsonResult;
   }
}
