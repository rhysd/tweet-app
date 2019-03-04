import * as fs from 'fs';
import * as path from 'path';
import { deepStrictEqual as eq, ok } from 'assert';
import { appDir, reset } from './mock';
import { loadConfig, openConfig, DEFAULT_CONFIG } from '../../main/config';

const { shell } = require('electron') as any; // mocked

const ConfigPath = path.join(appDir, 'config.json');

describe('config.ts', function() {
    afterEach(function() {
        try {
            fs.unlinkSync(ConfigPath);
        } catch (e) {
            // ignore
        }
    });

    describe('loadConfig()', function() {
        it('loads config from file', async function() {
            const config = {
                default_account: 'foo',
                other_accounts: ['aaa', 'bbb'],
                keymaps: {
                    'do something': 'Ctrl+X',
                },
                quit_on_close: true,
            };
            fs.writeFileSync(ConfigPath, JSON.stringify(config));

            const loaded = await loadConfig();
            eq(loaded, config);
        });

        it('loads config with default config for missing fields', async function() {
            const config: any = {
                default_account: 'foo',
            };
            fs.writeFileSync(ConfigPath, JSON.stringify(config));

            const loaded = await loadConfig();

            // Insert default values
            config['other_accounts'] = [];
            config['keymaps'] = {};
            config['quit_on_close'] = process.platform !== 'darwin';

            eq(loaded, config);
        });

        it('loads default config when no config found', async function() {
            const loaded = await loadConfig();
            eq(loaded, DEFAULT_CONFIG);
        });
    });

    describe('openConfig()', function() {
        beforeEach(function() {
            reset();
        });

        it('opens config with openItem()', async function() {
            const config = {
                default_account: 'foo',
                other_accounts: ['aaa', 'bbb'],
                keymaps: {
                    'do something': 'Ctrl+X',
                },
            };
            fs.writeFileSync(ConfigPath, JSON.stringify(config));

            await openConfig();
            ok(shell.openItem.calledOnce);
            eq(shell.openItem.getCall(0).args, [ConfigPath]);
        });

        it('opens config after writing default config to file when no config found', async function() {
            await openConfig();
            ok(shell.openItem.calledOnce);
            eq(shell.openItem.getCall(0).args, [ConfigPath]);
        });
    });
});
