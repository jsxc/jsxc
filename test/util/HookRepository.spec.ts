import { expect } from 'chai';
import 'mocha';

import HookRepository from '@src/util/HookRepository'

const NOT_EXPECTED_TO_BE_CALLED = 1000;

describe('HookRepository', () => {
    it('should fire one matching hook', () => {
        const hookRepository = new HookRepository();
        let count = 0;

        hookRepository.registerHook('foo', () => {
            count++;
        })

        hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        hookRepository.trigger('foo');

        expect(count).equals(1);
    })

    it('should fire multiple matching hooks', () => {
        const hookRepository = new HookRepository();
        let count = 0;

        hookRepository.registerHook('foo', () => {
            count++;
        })

        hookRepository.registerHook('foo', () => {
            count++;
        })

        hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        hookRepository.trigger('foo');

        expect(count).equals(2);
    })

    it('should fire only hooks with matching prefix', () => {
        const hookRepository = new HookRepository();
        let count = 0;

        hookRepository.registerHook('foo:bar', () => {
            count++;
        })

        hookRepository.registerHook('foo', () => {
            count++;
        })

        hookRepository.registerHook('fo', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        hookRepository.registerHook('foo:', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        hookRepository.registerHook('bar', () => {
            count += NOT_EXPECTED_TO_BE_CALLED;
        })

        hookRepository.trigger('foo:bar');

        expect(count).equals(2);
    })

    it('should not fire removed hooks', () => {
        const hookRepository = new HookRepository();
        let count = 0;

        let func1 = () => {
            count++;
        }

        let func2 = () => {
            count += 10;
        }

        hookRepository.registerHook('foo', func1)
        hookRepository.registerHook('foo', func2)

        hookRepository.trigger('foo')

        hookRepository.removeHook('foo', func2);

        hookRepository.trigger('foo')

        expect(count).equals(12);
    })

    it('should not crash if you remove hooks for unexisting event names', () => {
        const hookRepository = new HookRepository();

        hookRepository.removeHook('dummy', () => { })
    })

    it('should not crash if you remove unregistered hooks', () => {
        const hookRepository = new HookRepository();

        hookRepository.registerHook('foo', () => 1)

        hookRepository.removeHook('foo', () => 2)
    })
});
