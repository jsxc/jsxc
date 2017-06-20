import {expect} from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import onPresence from '../../../../src/connection/xmpp/handlers/presence'
import Client from '../../../../src/Client'
import AccountStub from '../../../AccountStub'
import Log from '../../../../src/util/Log'

describe('Presence handler', () => {
   before(function() {
      let account = new AccountStub;
      let getAccountStub = sinon.stub(Client, 'getAccout').returns(account);

      // let logStub = sinon.stub(Log, 'log').callsFake(function(level, message:string, data?:any){
      //
      // });
   });

   it('should ignore own presence notification', function() {
      let pres = $pres({
         type: '',
         from: Client.getAccout().getJID().bare
      });

      let presenceHandlerReturn = onPresence(pres.tree());

      expect(presenceHandlerReturn).equals(1);
   });

   it('should abort if stanza is of type "error"', function() {
      let pres = $pres({
         type: 'error',
         from: 'foo2@bar'
      });

      let presenceHandlerReturn = onPresence(pres.tree());

      expect(presenceHandlerReturn).equals(2);
   })

   it('should process a subscription request');

   it('should set text status for contact');

   it('should set presence for resource and not change contact presence');

   it('should set presence for resource and change contact presence');

   it('should reset ressource');
});
