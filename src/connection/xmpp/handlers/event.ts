import JID from '../../../JID';
import AbstractHandler from '../AbstractHandler';
import Geoloc from '@src/Geoloc';
import { IContact } from '@src/Contact.interface';

export default class extends AbstractHandler {
   public processStanza(stanza: Element) {
   
      let from = new JID($(stanza).attr('from'));
      let peerContact = this.account.getContact(from);
      if (typeof peerContact === 'undefined') {
         return this.PRESERVE_HANDLER;
      }

      let geoloc = $(stanza).find('geoloc[xmlns="http://jabber.org/protocol/geoloc"]');
      if (geoloc.length>0)
      {
         this.processGeoloc(geoloc,peerContact);
         return this.PRESERVE_HANDLER;
      }

      return this.PRESERVE_HANDLER;
   }

   private processGeoloc(geoloc: JQuery<HTMLElement>, from: IContact)
   {
      let geo: Geoloc = new Geoloc(from.getJid(),                    
                        (geoloc.find('lat').length>0?parseFloat(geoloc.find('lat').text()):undefined),
                        (geoloc.find('lon').length>0?parseFloat(geoloc.find('lon').text()):undefined),
                        (geoloc.find('timestamp').length>0?new Date(geoloc.find('timestamp').text()):undefined),
                        (geoloc.find('alt').length>0?parseFloat(geoloc.find('alt').text()):undefined),
                        (geoloc.find('accuracy').length>0?parseFloat(geoloc.find('accuracy').text()):undefined),                        
                        (geoloc.find('speed').length>0?parseFloat(geoloc.find('speed').text()):undefined),                        
                        (geoloc.find('bearing').length>0?parseFloat(geoloc.find('bearing').text()):undefined),
                        (geoloc.find('altaccuracy').length>0?parseFloat(geoloc.find('altaccuracy').text()):undefined));

      from.setPosition(geo);               
   }
}

