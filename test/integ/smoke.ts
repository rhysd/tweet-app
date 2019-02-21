import * as path from 'path';
import { Application } from 'spectron';
import { deepEqual as eq, ok } from 'assert';

const electronPath = require('electron') as any;

describe('Smoke', function() {
    this.timeout(10000);

    const appDir = path.join(__dirname, '..');
    let app: Application;

    before(async function() {
        app = new Application({
            path: electronPath,
            args: [appDir],
        });
        await app.start();
    });

    after(async function() {
        if (app && app.isRunning()) {
            await app.stop();
        }
    });

    it('shows window with mobile.twitter.com site', async function() {
        eq(await app.client.getWindowCount(), 1);
        const url = await app.client.getUrl();
        ok(url.startsWith('https://mobile.twitter.com'), url);
    });
});