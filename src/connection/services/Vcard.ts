import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import * as NS from '../xmpp/namespace'
import { $iq } from '../../vendor/Strophe'
import calculateHash from '../../util/SHA1Hash'

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

   public setAvatar(jid: IJID, avatar: string, mimetype: string)
   {
      let getVcardIQ = $iq({
         type: 'get',
         to: jid.bare
      }).c('vCard', {
         xmlns: NS.get('VCARD')
      });

      //first get the actual vcard to merge image into
      return this.sendIQ(getVcardIQ).then((stanza) => {
          if ($(stanza).attr('type')==='result')
          {
              let vcard = $(stanza).find('vCard');

              vcard = $($.parseXML(vcard.get(0).outerHTML)).find('>vCard');

              if (!vcard.length) {
                 //XML BECAUSE OF CASE SENSIVITY
                 vcard = $($.parseXML('<vCard '+NS.get('VCARD')+'/>').documentElement);
              }

              let photo = vcard.children('PHOTO');
              if (avatar!=null&&mimetype!=null)
              {
                  let type;
                  let binval;
                  if (photo.length===0)
                  {//XML BECAUSE OF CASE SENSIVITY
                      photo = $($.parseXML('<PHOTO/>').documentElement);
                      type = $($.parseXML('<TYPE/>').documentElement);
                      binval = $($.parseXML('<BINVAL/>').documentElement);
                      photo.append(type);
                      photo.append(binval);
                      vcard.append(photo);
                  }
                  else
                  {
                      type = photo.children('TYPE');
                      binval = photo.children('BINVAL');
                  }
                  type.text(mimetype);
                  binval.text(avatar);
              }
              else
              {
                  if (photo.length>0)
                  {
                      vcard.children('PHOTO').remove();
                  }
              }

              return this.sendVCard(jid,avatar, vcard, getVcardIQ);
          }
          else
          {
              return false;
          }
      });
   }

   private sendVCard(jid : IJID, avatar: string, vcard, getVcardIQ): Promise<any>
   {
       let sendVcardIQ = $iq({
                 type: 'set',
                 to: jid.bare
              }).cnode(vcard[0]);

        //second send the new vCard with avatar to server
        return this.sendIQ(sendVcardIQ).then((result)=>{
          if ($(result).attr('type')==='result')
          {
            //load the vcard again, because there could be a resize method on the server and we would have another hash
            return this.sendIQ(getVcardIQ).then((stanza) => {
                if ($(stanza).attr('type')==='result')
                {
                      let vcard = $(stanza).find('vCard');

                      vcard = $($.parseXML(vcard.get(0).outerHTML)).find('>vCard');

                      if (!vcard.length) {
                         //XML BECAUSE OF CASE SENSIVITY
                         vcard = $($.parseXML('<vCard '+NS.get('VCARD')+'/>').documentElement);
                      }

                      if (!vcard.length)
                         return false;

                      let photo = vcard.children('PHOTO');
                      if (photo!=null)
                      {
                           //NOW SEND THE PRESENCE
                           return this.sendPresence(photo.find('BINVAL').text(), jid);
                      }
                }
                else
                    return false;
            });
          }
          else
            return false;
      });
   }

   private sendPresence(avatar, jid: IJID) {
       let p;
       if (avatar!=null)
       {
         let sha1hash = calculateHash(avatar);

         p = $pres({from: jid.full}).c('x',{xmlns: 'vcard-temp:x:update' }).c('photo').t(sha1hash);
       }
       else
       {
         p = $pres({from: jid.full}).c('x',{xmlns: 'vcard-temp:x:update' }).c('photo');
       }

       return this.send(p.tree());
   }

   private parseVcard = (stanza) => {
      let data: any = {};
      let vcard =  typeof stanza === 'string' ? $($.parseXML(stanza)).find('vCard') : $(stanza).find('vCard');

      if (!vcard.length) {
         return data;
      }

      data = this.parseVcardChildren(vcard);

      return data;
   }

   private parseVcardChildren = (stanza) => {
      let self = this;
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
            data[itemName].push(value);
         } else if (data[itemName]) {
            data[itemName] = [data[itemName], value];
         } else {
            data[itemName] = value;
         }
      });

      return data;
   }
}
