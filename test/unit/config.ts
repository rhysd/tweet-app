import * as fs from 'fs';
import * as path from 'path';
import { deepStrictEqual as eq, ok } from 'assert';
import sinon = require('sinon');
import { SinonSpy } from 'sinon';
import { appDir } from './mock';
import { loadConfig, openConfig, DEFAULT_CONFIG } from '../../main/config';
import { shell } from 'electron'; // mocked

const ConfigPath = path.join(appDir, 'config.json');

describe('config.ts', function() {
    afterEach(function() {
        try {
            fs.unlinkSync(ConfigPath);
        } catch (e) {}
    });

    describe('loadConfig()', function() {
        it('loads config from file', async function() {
            const config = {
                default_account: 'foo',
                other_accounts: ['aaa', 'bbb'],
                keymaps: {
                    'do something': 'Ctrl+X',
                },
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

            eq(loaded, config);
        });

        it('loads default config when no config found', async function() {
            const loaded = await loadConfig();
            eq(loaded, DEFAULT_CONFIG);
        });
    });

    describe('openConfig()', function() {
        let saved: any;
        let openItem: SinonSpy;

        beforeEach(function() {
            saved = shell.openItem;
            openItem = sinon.fake();
            shell.openItem = openItem as any;
        });

        afterEach(function() {
            shell.openItem = saved;
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
            ok(openItem.calledOnce);
            eq(openItem.getCall(0).args, [ConfigPath]);
        });

        it('opens config after writing default config to file when no config found', async function() {
            await openConfig();
            ok(openItem.calledOnce);
            eq(openItem.getCall(0).args, [ConfigPath]);
        });
    });
});
