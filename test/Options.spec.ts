import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import IStorage from '@src/Storage.interface'
import Options from '@src/Options'
import * as defaultOptions from '@src/OptionsDefault'

describe('Options', function() {
    let options: Options;
    let storage = <IStorage> { };

    before(function() {
        options = new Options(storage);
    });

    after(function() {

    });

    it('should return the storage name as id', function() {
        const NAME = 'myName';
        storage.getName = sinon.stub().returns(NAME);

        expect(options.getId()).equals(NAME);
    });

    it('should return "client" as id for anonym storage', function() {
        storage.getName = sinon.stub().returns(undefined);

        expect(options.getId()).equals('client');
    });

    it('should return default options', function() {
        storage.getItem = sinon.stub().returns({});

        for (let name in defaultOptions) {
            expect(options.get(name)).equals(defaultOptions[name]);
        }
    });

    it('should return stored options', function() {
        const STORED_VALUE = 'foo';
        let store = {};

        for (let name in defaultOptions) {
            store[name] = STORED_VALUE;
        }

        storage.getItem = sinon.stub().returns(store);

        for (let name in defaultOptions) {
            expect(options.get(name)).equals(STORED_VALUE);
        }
    });

    it('should return "undefined" if the option is unknown', function() {
        storage.getItem = sinon.stub().returns({});

        expect(options.get('foobar')).equals(undefined);
    });

    it('should return overwritten defaults', function() {
        storage.getItem = sinon.stub().returns({});
        const KEY = 'onLogin';
        const VALUE = 'foo';

        Options.overwriteDefaults({
            [KEY]: VALUE
        });

        expect(options.get(KEY)).equals(VALUE);
    });

    it('should ignore unknown options if overwritten', function() {
        storage.getItem = sinon.stub().returns({});

        Options.overwriteDefaults({
            foo: 'bar'
        });

        expect(options.get('foo')).equals(undefined);
    });

    it('should add new defaults and ignore existing', function() {
        storage.getItem = sinon.stub().returns({});

        Options.overwriteDefaults({
            newOption: 'new',
            onLogin: 'foobar',
        });

        expect(options.get('newOption')).equals(undefined);
        expect(options.get('onLogin')).equals(defaultOptions.onLogin);
    });

    it('should update the value in the store', function() {
        const KEY = 'foo';
        const VALUE = 'bar';
        storage.updateItem = sinon.stub();

        options.set(KEY, VALUE);

        expect((<sinon.SinonSpy> storage.updateItem).args[0][1]).equals(KEY);
        expect((<sinon.SinonSpy> storage.updateItem).args[0][2]).equals(VALUE);
    });

    it('should trigger onOptionChange', function() {
        const KEY = 'foo';
        const VALUE = 'bar';
        storage.updateItem = sinon.stub();
        let newOptions = {
            onOptionChange: sinon.stub(),
        };
        Options.overwriteDefaults(newOptions);

        options.set(KEY, VALUE);

        expect((<sinon.SinonSpy> newOptions.onOptionChange).args[0][1]).equals(KEY);
        expect((<sinon.SinonSpy> newOptions.onOptionChange).args[0][2]).equals(VALUE);
    })

    it('should trigger registered hooks', function() {
        const KEY = 'onLogin';
        const VALUE = 'foobar';
        const OLD_VALUE = 'old_foobar';

        storage.registerHook = sinon.stub();
        let handler = sinon.stub();

        options.registerHook(KEY, handler);

        options.set(KEY, VALUE);

        (<sinon.SinonSpy> storage.registerHook).args[0][1]({[KEY]: VALUE}, {[KEY]: OLD_VALUE});

        expect((<sinon.SinonSpy> handler).args[0][0]).equals(VALUE);
        expect((<sinon.SinonSpy> handler).args[0][1]).equals(OLD_VALUE);
    });

    it('should export only stored options', function() {
        storage.getItem = sinon.stub().returns({
            foo: 'bar',
            bar: 'foo',
        });

        let data = options.export();

        expect(data.foo).equals('bar');
        expect(data.bar).equals('foo');
    })
});