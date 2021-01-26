import log from '../../main/log';
import { ok } from 'assert';

describe('log', function () {
    it('defines functions for logging', function () {
        ok(log.info);
        ok(log.error);
        ok(log.warn);
        ok(log.debug);
        log.debug();
    });
});
