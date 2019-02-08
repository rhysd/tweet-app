import { IS_DEBUG, IS_DEV } from './constants';

const log = console;

function noop() {}

if (!IS_DEBUG) {
    log.debug = noop;
    if (!IS_DEV) {
        log.info = noop;
    }
}

export default log;
