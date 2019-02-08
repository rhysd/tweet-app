import * as fs from 'fs';
import { CONFIG_FILE } from './constants';
import log from './log';

function makeDefaultConfig(): Config {
    return {};
}

export function loadConfig(): Promise<Config> {
    const defaultConfig = makeDefaultConfig();
    return new Promise<Config>(resolve => {
        fs.readFile(CONFIG_FILE, 'utf8', (err, json) => {
            if (err) {
                log.info('Skipped loading', CONFIG_FILE, err.message);
                resolve(defaultConfig);
                return;
            }

            try {
                const config = { ...defaultConfig, ...JSON.parse(json) };
                log.info('Loaded config', config);
                resolve(config);
            } catch (e) {
                log.error('Cannot read config file', CONFIG_FILE, 'as JSON:', e.message);
                resolve(defaultConfig);
            }
        });
    });
}
