import { expect } from 'chai';
import 'mocha';

import JID from '@src/JID'

class JIDDummy {
    constructor(public node: string, public domain: string, public resource: string = '') {

    }

    public toEscapedString() {
        let node = this.node.replace(/^\s+|\s+$/g, '')
            .replace(/\\/g, '\\5c')
            .replace(/ /g, '\\20')
            .replace(/\"/g, '\\22')
            .replace(/\&/g, '\\26')
            .replace(/\'/g, '\\27')
            .replace(/\//g, '\\2f')
            .replace(/:/g, '\\3a')
            .replace(/</g, '\\3c')
            .replace(/>/g, '\\3e')
            .replace(/@/g, '\\40');

        return node + '@' + this.domain + ((this.resource) ? '/' + this.resource : '');
    }

    public toUnescapedString() {
        return this.node + '@' + this.domain + ((this.resource) ? '/' + this.resource : '');
    }
}

describe('JID', function() {

    let jids = [
        new JIDDummy('foo', 'localhost'),
        new JIDDummy('foo.bar', 'localhost'),
        new JIDDummy('foo', 'bar.local'),
        new JIDDummy('foo.bar', 'local.host'),
        new JIDDummy('foo.bar', 'localhost', 'res'),
        new JIDDummy('foo.bar', 'local.host', 'random'),
        new JIDDummy('foo.bar', 'local.host', 'rand/om'),
        new JIDDummy('äöüßᚹᛦᛚᚳᚢᛗணோம்', 'local.host', '私はガラス'),
        new JIDDummy('foo bar', 'local.host', 'rand om'),
        new JIDDummy('foo "&\'":<>@bar', 'your.local.host')
    ];

    it('should split a JID in its components', function() {
        jids.forEach((dummy) => {
            let jid = new JID(dummy.toEscapedString());

            expect(jid.node).equals(dummy.node);
            expect(jid.domain).equals(dummy.domain);
            expect(jid.resource).equals(dummy.resource);
        });
    });

    it('should escape a JID', function() {
        jids.forEach((dummy) => {
            let jid = new JID(dummy.toEscapedString());

            expect(jid.toEscapedString()).equals(dummy.toEscapedString());
        });
    });

    it('should unescape a JID', function() {
        jids.forEach((dummy) => {
            let jid = new JID(dummy.toEscapedString());

            expect(jid.toString()).equals(dummy.toUnescapedString());
        });
    });

    it('should lower-case node and domain part', function() {
        let jid1 = new JID('Foo.Bar@Local.Host/Random');
        let jid2 = new JID('fOo.baR@loCAL.HOST/Random');

        expect(jid1.node).equals(jid2.node);
        expect(jid1.domain).equals(jid2.domain);

        expect(jid1.toString()).equals(jid2.toString());
    });

    it('should not lower-case resource part', function() {
        let jid1 = new JID('Foo.Bar@Local.Host/RanDom');
        let jid2 = new JID('fOo.baR@loCAL.HOST/RANDOM');

        expect(jid1.resource).not.equals(jid2.resource);
        expect(jid1.toString()).not.equal(jid2.toString());
    });
});
