import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import Pipe from '../src/util/Pipe'

describe('Pipe', () => {
    it('should return the same pipe for the same name', () => {
        let pipeA = Pipe.get('dummy');
        let pipeB = Pipe.get('dummy');

        expect(pipeA).equals(pipeB);
    })

    it('should return different pipes for different names', () => {
        let pipeA = Pipe.get('dummyA');
        let pipeB = Pipe.get('dummyB');

        expect(pipeA).not.equals(pipeB);
    })

    it('should run an empty pipe', () => {
        let pipeA = Pipe.get('dummy_empty');

        return pipeA.run('A', 'B', 1234).then(([arg1, arg2, arg3]) => {
            expect(arg1).equals('A');
            expect(arg2).equals('B');
            expect(arg3).equals(1234);
        });
    })

    it('should progress in order with distinct priority', () => {
        let pipeA = Pipe.get('dummy_distinct');

        pipeA.addProcessor(function(a, b, c) {
            return Promise.resolve([a + 'a', b + 'b', c * 2]);
        }, 20);

        pipeA.addProcessor(function(a, b, c) {
            return Promise.resolve([a + 'c', b + 'd', c + 1]);
        }, 30);

        pipeA.addProcessor(function(a, b, c) {
            return Promise.resolve([a + 'e', b + 'f', c * 3]);
        }, 80);

        return pipeA.run('A', 'B', 1234).then(([arg1, arg2, arg3]) => {
            expect(arg1).equals('Aace');
            expect(arg2).equals('Bbdf');
            expect(arg3).equals(7407);
        });
    })

    it('should progress in order with multiple priority', () => {
        let pipeA = Pipe.get('dummy_multiple');

        pipeA.addProcessor(function(a, b, c) {
            return [a + 'a', b + 'b', c * 2];
        }, 20);

        pipeA.addProcessor(function(a, b, c) {
            return Promise.resolve([a + 'c', b + 'd', c + 1]);
        }, 20);

        pipeA.addProcessor(function(a, b, c) {
            return Promise.resolve([a + 'e', b + 'f', c * 3]);
        }, 20);

        return pipeA.run('A', 'B', 1234).then(([arg1, arg2, arg3]) => {
            expect(arg1).equals('Aace');
            expect(arg2).equals('Bbdf');
            expect(arg3).equals(7407);
        });
    })

    it('should reject processor with invalid priority', () => {
        let pipeA = Pipe.get('dummy_invalid');

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve(); }, -1);
        }).to.throw();

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve(); }, 101);
        }).to.throw();

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve(); }, <any>'abc');
        }).to.throw();
    })
});
