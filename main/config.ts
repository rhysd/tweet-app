import { promises as fs } from 'fs';
import { shell } from 'electron';
import { CONFIG_FILE, DATA_DIR, ON_DARWIN } from './constants';
import log from './log';
import type { Config } from '../types/common';

export const DEFAULT_CONFIG: Config = {
    default_account: '',
    other_accounts: [],
    keymaps: {},
    quit_on_close: !ON_DARWIN,
};

export async function loadConfig(): Promise<Config> {
    try {
        const json = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = { ...DEFAULT_CONFIG, ...JSON.parse(json) };
        log.info('Loaded config', config);
        return config;
    } catch (err) {
        log.info('Skipped loading', CONFIG_FILE, 'due to', err.message);
        return DEFAULT_CONFIG;
    }
}

export async function openConfig(): Promise<void> {
    try {
        await fs.access(DATA_DIR);
    } catch (err) {
        log.error('Cannot access to data directory.', DATA_DIR, 'does not exist:', err.message);
        return;
    }

    try {
        await fs.access(CONFIG_FILE);
    } catch (err) {
        const json = JSON.stringify(DEFAULT_CONFIG, null, 2);
        await fs.writeFile(CONFIG_FILE, json, 'utf8');
        log.info('Created empty config file at', CONFIG_FILE);
    }

    const errMsg = await shell.openPath(CONFIG_FILE);
    if (errMsg !== '') {
        throw new Error(`Could not open '${CONFIG_FILE}: ${errMsg}`);
    }

    log.info('Opened', CONFIG_FILE);
}
