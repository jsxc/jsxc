import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import PresenceHandler from '../../../../src/connection/xmpp/handlers/presence'
import Client from '../../../../src/Client'
import AccountStub from '../../../AccountStub'
import Log from '../../../../src/util/Log'

describe('Presence handler', () => {
    let handler;

    before(function() {
        let account = new AccountStub;
        let getAccountStub = sinon.stub(Client, 'getAccount').returns(account);
        handler = new PresenceHandler(getAccountStub());

        // let logStub = sinon.stub(Log, 'log').callsFake(function(level, message:string, data?:any){
        //
        // });
    });

    it('should ignore own presence notification', function() {
        let pres = $pres({
            type: '',
            from: Client.getAccount().getJID().bare
        });

        //@TODO test return reason

        let presenceHandlerReturn = handler.processStanza(pres.tree());

        expect(presenceHandlerReturn).to.be.true;
    });

    it('should abort if stanza is of type "error"', function() {
        let pres = $pres({
            type: 'error',
            from: 'foo2@bar'
        });

        //@TODO test return reason

        let presenceHandlerReturn = handler.processStanza(pres.tree());

        expect(presenceHandlerReturn).to.be.true;
    })

    it('should process a subscription request');

    it('should set text status for contact');

    it('should set presence for resource and not change contact presence');

    it('should set presence for resource and change contact presence');

    it('should reset ressource');
});
