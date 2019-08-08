import * as path from 'path';
import { Application } from 'spectron';
import { deepStrictEqual as eq, ok, rejects } from 'assert';

const electronPath = require('electron') as any;

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(() => resolve('timeout!!'), ms));
}

describe('Smoke', function() {
    this.timeout(10000);

    const appDir = path.join(__dirname, '..', '..');
    let app: Application;

    before(async function() {
        app = new Application({
            path: electronPath,
            args: [appDir, '--integration-test-running'],
        });
        await app.start();
    });

    after(async function() {
        if (app && app.isRunning()) {
            const ret = await Promise.race([timeout(5000), app.stop]);
            if (ret === 'timeout!!') {
                console.error('Application.prototype.stop() did not stop app within 5 seconds');
            }
        }
    });

    it('shows window with mobile.twitter.com site', async function() {
        eq(await app.client.getWindowCount(), 1);
        const url = await app.client.getUrl();
        ok(url.startsWith('https://mobile.twitter.com'), url);
    });

    it('disables Node integration', async function() {
        const expected = {
            message: 'javascript error: require is not defined',
        };
        await rejects(() => app.client.execute(() => require('electron')) as any, expected);
    });
});
