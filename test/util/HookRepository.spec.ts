import { expect } from 'chai';
import 'mocha';

import HookRepository from '@src/util/HookRepository'

const NOT_EXPECTED_TO_BE_CALLED = 1000;

describe('HookRepository', () => {
    beforeEach(() => {
        this.hookRepository = new HookRepository();
    });

    it('should fire one matching hook', () => {
        let count = 0;

        this.hookRepository.registerHook('foo', () => {
            count++;
        })

        this.hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        this.hookRepository.trigger('foo');

        expect(count).equals(1);
    })

    it('should fire multiple matching hooks', () => {
        let count = 0;

        this.hookRepository.registerHook('foo', () => {
            count++;
        })

        this.hookRepository.registerHook('foo', () => {
            count++;
        })

        this.hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        this.hookRepository.trigger('foo');

        expect(count).equals(2);
    })

    it('should fire only hooks with matching prefix', () => {
        let count = 0;

        this.hookRepository.registerHook('foo:bar', () => {
            count++;
        })

        this.hookRepository.registerHook('foo', () => {
            count++;
        })

        this.hookRepository.registerHook('fo', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        this.hookRepository.registerHook('foo:', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        this.hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        this.hookRepository.trigger('foo:bar');

        expect(count).equals(2);
    })

    it('should not fire removed hooks', () => {
        let count = 0;

        let func1 = () => {
            count++;
        }

        let func2 = () => {
            count += 10;
        }

        this.hookRepository.registerHook('foo', func1)
        this.hookRepository.registerHook('foo', func2)

        this.hookRepository.trigger('foo')

        this.hookRepository.removeHook('foo', func2);

        this.hookRepository.trigger('foo')

        expect(count).equals(12);
    })

    it('should not crash if you remove hooks for unexisting event names', () => {
        this.hookRepository.removeHook('dummy', () => { })
    })

    it('should not crash if you remove unregistered hooks', () => {
        this.hookRepository.registerHook('foo', () => 1)

        this.hookRepository.removeHook('foo', () => 2)
    })
});
