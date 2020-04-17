import { expect } from 'chai';
import 'mocha';

import Pipe from '@src/util/Pipe'

describe('Pipe', () => {
    it('should run an empty pipe', () => {
        let pipeA = new Pipe();

        return pipeA.run('A', 'B', 1234).then(([arg1, arg2, arg3]) => {
            expect(arg1).equals('A');
            expect(arg2).equals('B');
            expect(arg3).equals(1234);
        });
    })

    it('should progress in order with distinct priority', () => {
        let pipeA = new Pipe();

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
        let pipeA = new Pipe();

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
        let pipeA = new Pipe();

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve([]); }, -1);
        }).to.throw();

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve([]); }, 101);
        }).to.throw();

        expect(() => {
            pipeA.addProcessor(function(...args) { return Promise.resolve([]); }, <any> 'abc');
        }).to.throw();
    })
});
