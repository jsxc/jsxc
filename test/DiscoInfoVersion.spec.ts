import { expect } from 'chai';
import 'mocha';
import DiscoInfoVersion from '@src/DiscoInfoVersion';
import Form from '@connection/Form';

let simpleFeatures = [
    'http://jabber.org/protocol/disco#info',
    'http://jabber.org/protocol/disco#items',
    'http://jabber.org/protocol/muc',
    'http://jabber.org/protocol/caps',
];
let simpleIdentities = [{
    category: 'client',
    type: 'pc',
    name: 'Exodus 0.9.1',
}];
let complexIdentities = [{
    category: 'client',
    name: 'Psi 0.11',
    type: 'pc',
    lang: 'en',
}, {
    category: 'client',
    name: 'Ψ 0.11',
    type: 'pc',
    lang: 'el',
}];
let form = Form.fromXML(`<x xmlns='jabber:x:data' type='result'>
<field var='FORM_TYPE' type='hidden'>
  <value>urn:xmpp:dataforms:softwareinfo</value>
</field>
<field var='ip_version'>
  <value>ipv4</value>
</field>
<field var='os'>
  <value>Mac</value>
</field>
<field var='os_version'>
  <value>10.5.1</value>
</field>
<field var='software'>
  <value>Psi</value>
</field>
<field var='software_version'>
  <value>0.11</value>
</field>
</x>`);
let features = [
    'eu.siacs.conversations.axolotl.devicelist+notify',
    'http://jabber.org/protocol/caps',
    'http://jabber.org/protocol/chatstates',
    'http://jabber.org/protocol/disco#info',
    'http://jabber.org/protocol/muc',
    'urn:xmpp:avatar:metadata+notify',
    'urn:xmpp:blocking',
    'urn:xmpp:carbons:2',
    'urn:xmpp:chat-markers:0',
    'urn:xmpp:ping',
    'urn:xmpp:receipts',
    'http://jabber.org/protocol/disco#info',
    'urn:xmpp:carbons:2',
    'http://jabber.org/protocol/muc',
    'http://jabber.org/protocol/caps',
    'urn:xmpp:receipts',
    'urn:xmpp:blocking',
    'http://jabber.org/protocol/chatstates',
    'urn:xmpp:chat-markers:0',
    'urn:xmpp:ping',
    'urn:xmpp:avatar:metadata+notify',
    'eu.siacs.conversations.axolotl.devicelist+notify',
    'http://jabber.org/protocol/disco#info',
    'urn:xmpp:carbons:2',
    'http://jabber.org/protocol/muc',
    'http://jabber.org/protocol/caps',
    'urn:xmpp:receipts',
    'urn:xmpp:blocking',
    'http://jabber.org/protocol/chatstates',
    'urn:xmpp:chat-markers:0',
    'urn:xmpp:ping',
    'urn:xmpp:avatar:metadata+notify',
    'eu.siacs.conversations.axolotl.devicelist+notify'
];
let identities = [{
    category: 'client',
    type: 'pc',
}];

describe('Disco Info Version', function() {
    it('should calculate correct version for simple example', function() {
        let version = DiscoInfoVersion.generate(simpleIdentities, simpleFeatures);

        expect(version).equals('QgayPKawpkPSDYmwT/WM94uAlu0=');
    })

    it('should calculate correct version for complex example', function() {
        let version = DiscoInfoVersion.generate(complexIdentities, simpleFeatures, [form]);

        expect(version).equals('Vjv+a+F4kYknAeb8sn8KuQ99Dtc=');
    })

    it('should calculate correct version with unordered duplicated features and one identity', function() {
        let version = DiscoInfoVersion.generate(identities, features);

        expect(version).equals('xfqBWcnCppu+uy1Iyk5cV2mQFSs=');
    })
});
