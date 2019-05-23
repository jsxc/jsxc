import { expect } from 'chai';
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

    it('should detect property objects', () => {
        expect(Utils.isObject({}), 'Empty object').equals(true);
        expect(Utils.isObject({a: 1}), 'Object').equals(true);

        expect(Utils.isObject(undefined), 'Undefined').equals(false);
        expect(Utils.isObject(0), 'Number 0').equals(false);
        expect(Utils.isObject(1), 'Number 1').equals(false);
        expect(Utils.isObject(true), 'True boolean').equals(false);
        expect(Utils.isObject(false), 'False boolean').equals(false);
        expect(Utils.isObject([]), 'Empty array').equals(false);
        expect(Utils.isObject(['foo']), 'Array').equals(false);
        expect(Utils.isObject(''), 'Empty string').equals(false);
        expect(Utils.isObject('foo'), 'String').equals(false);
        expect(Utils.isObject(new Date()), 'Date object').equals(false);
    })

    it('should deep merge objects', () => {
        let date = new Date();
        let target: any = {
            a: {
                b: 'bar',
            },
            b: 'foobar',
            c: 'bar',
        };
        let source1 = {
            a: {
                a: 'new',
                b: 'foobar',
            },
            c: 'foobar',
            d: date,
        };
        let source2 = {
            a: {
                c: 'foobar',
            },
            e: 'foobar',
        }
        let returnValue = Utils.mergeDeep(target, source1, source2);

        expect(returnValue).equals(target);
        expect(target.a.a, 'target.a.a').equals('new');
        expect(target.a.b, 'target.a.b').equals('foobar');
        expect(target.a.c, 'target.a.c').equals('foobar');
        expect(target.b, 'target.b').equals('foobar');
        expect(target.c, 'target.c').equals('foobar');
        expect(target.d, 'target.d').equals(date);
        expect(target.e, 'target.e').equals('foobar');
    });
});
