import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import DiscoInfo from '../src/DiscoInfo'

describe('JID', function() {
    it('should', function() {
        let di = new DiscoInfo([{
            category: 'client',
            name: 'Exodus 0.9.1',
            type: 'pc'
        }], ['http://jabber.org/protocol/caps', 'http://jabber.org/protocol/disco#info', 'http://jabber.org/protocol/disco#items', 'http://jabber.org/protocol/muc']);

        console.log('caps version', 'QgayPKawpkPSDYmwT/WM94uAlu0=', di.getCapsVersion());
    })
});
