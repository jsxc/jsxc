import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import Utils from '@src/util/Utils'

describe('Utils', () => {
    it('should remove HTML', () => {
        expect(Utils.removeHTML('<p>Foobar <img src="" /><b>Foobar</p>')).equals('Foobar Foobar');
    });

    it('should not remove equations', () => {
        expect(Utils.removeHTML('x < y')).equals('x < y');
        expect(Utils.removeHTML('x < y && y > x')).equals('x < y && y > x');
    });

    it('should escape the following characters: &<>', () => {
        expect(Utils.escapeHTML('<>&&amp;&lt;&gt;')).equals('&lt;&gt;&amp;&amp;&lt;&gt;');
    })
});
