import * as path from 'path';
import { Application } from 'spectron';
import { deepStrictEqual as eq, ok, rejects } from 'assert';

const electronPath = require('electron') as any;
const appDir = path.join(__dirname, '..', '..');

describe('Smoke', function () {
    this.timeout(10000);

    let app: Application;

    before(async function () {
        if (process.platform === 'darwin' || process.platform === 'win32') {
            // Spectron v12.0.0 (Electron v11) does not work on macOS and Windows. On macOS,
            // it launches the application but cannot detect the application was launched.
            // As the result, starting application fails and many application instances are left open.
            this.skip();
        }

        app = new Application({
            path: electronPath,
            args: [appDir, '--integration-test-running'],
        });
        await app.start();
    });

    after(async function () {
        if (app?.isRunning()) {
            await app.stop();
        }
    });

    it('shows window with mobile.twitter.com site', async function () {
        eq(await app.client.getWindowCount(), 1);
        const url = await app.client.getUrl();
        ok(url.startsWith('https://mobile.twitter.com'), url);
    });

    it('disables Node integration', async function () {
        await rejects(
            () => app.client.execute(() => require('electron')) as any,
            (err: Error) => {
                ok(err.message.includes('javascript error: require is not defined'), err);
                return true;
            },
        );
    });
});
