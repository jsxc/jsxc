import AbstractService from './AbstractService'
import { IJID } from '../../JID.interface'
import Form from '../Form'
import {  $iq  } from '../../vendor/Strophe'

export default class Search extends AbstractService {

   public getSearchForm(jid: IJID): Promise<Element>
   {
      let iq = $iq({
         to: jid,
         type: 'get'
      }).c('query', {
         xmlns: 'jabber:iq:search'
      });

      return this.sendIQ(iq);
   }

   public executeSearchForm(jid: IJID, form: Form): Promise<Element>
   {
      let iq = $iq({
         to: jid,
         type: 'set'
      }).c('query', {
         xmlns: 'jabber:iq:search'
      }).cnode(form.toXML());

      return this.sendIQ(iq);
   }

}
