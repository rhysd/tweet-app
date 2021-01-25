import { IS_DEBUG, IS_DEV } from './constants';

const log = { debug: console.debug, info: console.info, error: console.error, warn: console.warn };

function noop(): void {
    /* do nothing */
}

if (!IS_DEBUG) {
    log.debug = noop;
    if (!IS_DEV) {
        log.info = noop;
    }
}

export default log;
