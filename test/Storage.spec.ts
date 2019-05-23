import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import Storage from '@src/Storage'

describe('Storage', function() {
    let storage;

    before(function() {
        storage = new Storage();
    })

    after(function() {
        storage.getBackend().clear();
    })

    it('should mark storage as not conform');

    it('should mark storage as conform');

    it('should return the right prefix', function() {
        expect(storage.getPrefix()).equals('jsxc2:');
    })

    it('should properly generate keys', function() {
        expect(storage.generateKey('foo')).equals('foo');
        expect(storage.generateKey('foo', 'bar')).equals('foo:bar');
        expect(storage.generateKey('foo', 'bar', '1')).equals('foo:bar:1');
        expect(storage.generateKey('foo', 'bar', '1', '2')).equals('foo:bar:1:2');
    })

    it('should save key/value pairs', function() {
        let data = [
            { foo: 'bar' },
            { foo: true },
            { foo: { foo: 'bar' } }
        ];

        let spy = sinon.spy(storage.getBackend(), 'setItem');

        data.forEach(function(pair, index) {
            let key = Object.keys(pair)[0];
            let value = pair[key];

            storage.setItem(key, value);

            let expectedStoredValue = value;

            if (typeof value === 'object') {
                expectedStoredValue = JSON.stringify(value);
            }

            expect(spy.args[index][0]).equals('jsxc2:' + key);
            expect(spy.args[index][1]).equals(expectedStoredValue);
        });
    })

    it('should save key/value pairs of a specific type')

    it('should properly retrieve key/value pairs')

    it('should properly retrieve key/value pairs of a specific type')
});
