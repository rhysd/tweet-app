import { deepStrictEqual as eq, ok, fail } from 'assert';
import { JSDOM } from 'jsdom';
import sinon = require('sinon');
import { reset } from './mock';
import App from '../../renderer/app';

const { ipcRenderer } = require('electron') as any; // mocked

describe('App', function() {
    let app: App;

    beforeEach(function() {
        reset();
        (global as any).window = {
            addEventListener: sinon.spy(),
        };
        app = new App();
        app.start();
    });

    afterEach(function() {
        delete (global as any).window;
        delete (global as any).document;
    });

    function emulateSend(chan: IPC.Chan, ...args: any[]) {
        ok(ipcRenderer.on.called);
        const calls = ipcRenderer.on.getCalls();
        for (const call of calls) {
            if (call.args[0] === chan) {
                call.args[1](null, ...args);
                return;
            }
        }
        fail(`No listener for ${chan}: ${JSON.stringify(calls, null, 2)}`);
    }

    it('sets action after tweet on IPC message', function() {
        emulateSend('tweetapp:action-after-tweet', 'reply previous');
        eq((app as any).afterTweet, 'reply previous');
    });

    it('sets screen name on IPC message', function() {
        emulateSend('tweetapp:screen-name', 'foo');
        eq((app as any).screenName, 'foo');
    });

    it('reopens given URL when no screen name is set on tweetapp:sent-tweet', function() {
        // Navigation is not implemented in jsdom
        (global as any).window.location = {};
        const url = 'https://mobile.twitter.com/compose/tweet';
        emulateSend('tweetapp:sent-tweet', url);
        eq(window.location.href, url);
    });

    it('finds previous tweet ID and sets in_reply_to query param on tweetapp:sent-tweet', async function() {
        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:action-after-tweet', 'reply previous');

        let url: string | undefined;
        function setHrefSpy() {
            return new Promise(resolve => {
                (global as any).window.location = {
                    set href(u: string) {
                        url = u;
                        resolve();
                    },
                };
            });
        }
        let hrefWasSet = setHrefSpy();

        (global as any).document = new JSDOM(`
              <body>
                <a href="/foo/status/114514">tweet</a>
              </body>
            `).window.document;

        const twUrl = 'https://mobile.twitter.com/compose/tweet';
        emulateSend('tweetapp:sent-tweet', twUrl);

        await hrefWasSet;
        eq(url, twUrl + '?in_reply_to=114514');

        const call = ipcRenderer.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:prev-tweet-id');
        eq(call.args[1], '114514');

        hrefWasSet = setHrefSpy();
        const twTextUrl = 'https://mobile.twitter.com/compose/tweet?text=hello';
        emulateSend('tweetapp:sent-tweet', twTextUrl);

        await hrefWasSet;
        eq(url, twTextUrl + '&in_reply_to=114514');
    });

    it('searches tweet button with 4s timeout', async function() {
        this.timeout(10000); // Timeout is 4 seconds
        const start = Date.now();

        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:action-after-tweet', 'reply previous');

        let url: string | undefined;
        function setHrefSpy() {
            return new Promise(resolve => {
                (global as any).window.location = {
                    set href(u: string) {
                        url = u;
                        resolve();
                    },
                };
            });
        }
        let hrefWasSet = setHrefSpy();

        (global as any).document = new JSDOM('').window.document;

        const twUrl = 'https://mobile.twitter.com/compose/tweet';
        emulateSend('tweetapp:sent-tweet', twUrl);

        await hrefWasSet;
        const elapsedMs = Date.now() - start;
        eq(url, twUrl);
        ok(elapsedMs > 4000, `${elapsedMs}`);
    });

    it('opens given URL on tweetapp:open', function() {
        // Navigation is not implemented in jsdom
        (global as any).window.location = {};
        const url = 'https://mobile.twitter.com/compose/tweet?text=hello';
        emulateSend('tweetapp:open', url);
        eq(window.location.href, url);
    });

    it('sets login name to user name <input> on tweetapp:login', function() {
        (global as any).document = new JSDOM(`
            <input name="username_or_email"/>
            <input name="password"/>
        `).window.document;

        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:login');

        const input = document.querySelector('input[name*="username_or_email"]') as HTMLInputElement | null;
        ok(input);
        eq(input!.value, 'foo');
    });

    it('does not set login name to user name <input> on tweetapp:login when screen name is unknown or <input> is not found', function() {
        (global as any).document = new JSDOM(`
            <input name="username_or_email"/>
            <input name="password"/>
        `).window.document;

        emulateSend('tweetapp:login');

        const input = document.querySelector('input[name*="username_or_email"]') as HTMLInputElement | null;
        ok(input);
        eq(input!.value, '');

        input!.name = 'foooo';
        emulateSend('tweetapp:login'); // Should not raise an error
    });

    for (const html of [
        '<div data-testid="tweetButton"></div>',
        '<div role="button" tabIndex="0">Tweet</div>',
        '<div role="button" tabIndex="0">Tweet All</div>',
        '<div role="button" tabIndex="0">Reply</div>',
        '<div role="button" tabIndex="0">ツイート</div>',
        '<div role="button" tabIndex="0">すべてツイート</div>',
        '<div role="button" tabIndex="0">返信</div>',
    ]) {
        it(`finds tweet button from "${html}" on tweetapp:click-tweet-button`, function() {
            (global as any).document = new JSDOM(html).window.document;

            const click = sinon.fake();
            (document.getElementsByTagName('DIV')[0] as HTMLDivElement).click = click;

            emulateSend('tweetapp:click-tweet-button');
            ok(click.calledOnce);
        });
    }

    it('does nothing when button is not found', function() {
        (global as any).document = new JSDOM('<div role="button" tabIndex="0">Foooo!!!!!</div>').window.document;
        const click = sinon.fake();
        (document.getElementsByTagName('DIV')[0] as HTMLDivElement).click = click;
        emulateSend('tweetapp:click-tweet-button');
        ok(!click.called);
    });

    it('sends IPC message to main process when online status changed', function() {
        (window as any).navigator = { onLine: true };
        const calls = (window as any).addEventListener.getCalls();
        const onOnline = calls.find((c: any) => c.args[0] === 'online').args[1];
        const onOffline = calls.find((c: any) => c.args[0] === 'offline').args[1];
        const onLoad = calls.find((c: any) => c.args[0] === 'load').args[1];

        onLoad();
        eq(ipcRenderer.send.lastCall.args, ['tweetapp:online-status', 'online']);

        onOffline();
        eq(ipcRenderer.send.lastCall.args, ['tweetapp:online-status', 'offline']);

        onOnline();
        eq(ipcRenderer.send.lastCall.args, ['tweetapp:online-status', 'online']);
    });
});
