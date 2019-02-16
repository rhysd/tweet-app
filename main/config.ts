import { promises as fs } from 'fs';
import { shell } from 'electron';
import { CONFIG_FILE, DATA_DIR } from './constants';
import log from './log';

function makeDefaultConfig(): Config {
    return {
        default_account: '',
        other_accounts: [],
        keymaps: {},
    };
}

export async function loadConfig(): Promise<Config> {
    const defaultConfig = makeDefaultConfig();
    try {
        const json = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = { ...defaultConfig, ...JSON.parse(json) };
        log.info('Loaded config', config);
        return config;
    } catch (err) {
        log.info('Skipped loading', CONFIG_FILE, 'due to', err.message);
        return defaultConfig;
    }
}

export async function openConfig() {
    try {
        await fs.access(DATA_DIR);
    } catch (err) {
        log.error('Cannot access to data directory', DATA_DIR, 'does not exist:', err.message);
        return;
    }

    try {
        await fs.access(CONFIG_FILE);
    } catch (err) {
        const json = JSON.stringify(makeDefaultConfig(), null, 2);
        await fs.writeFile(CONFIG_FILE, json, 'utf8');
        log.info('Created empty config file at', CONFIG_FILE);
    }

    shell.openItem(CONFIG_FILE);
    log.info('Opened', CONFIG_FILE);
}
