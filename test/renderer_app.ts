/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { deepStrictEqual as eq, ok, fail } from 'assert';
import { JSDOM } from 'jsdom';
import sinon = require('sinon');
import App from '../renderer/app';
import type { IpcFromMain } from '../types/common';
import { reset } from './mock';

const { ipcRenderer } = require('electron') as any; // mocked

describe('App', function () {
    let app: App;

    beforeEach(function () {
        reset();
        (global as any).window = {
            addEventListener: sinon.spy(),
        };
        app = new App();
        app.start();
    });

    afterEach(function () {
        delete (global as any).window;
        delete (global as any).document;
    });

    function emulateSend(chan: IpcFromMain, ...args: any[]) {
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

    it('sets action after tweet on IPC message', function () {
        emulateSend('tweetapp:action-after-tweet', 'reply previous');
        eq((app as any).afterTweet, 'reply previous');
    });

    it('sets screen name on IPC message', function () {
        emulateSend('tweetapp:screen-name', 'foo');
        eq((app as any).screenName, 'foo');
    });

    it('reopens given URL when no screen name is set on tweetapp:sent-tweet', function () {
        // Navigation is not implemented in jsdom
        (global as any).window.location = {};
        const url = 'https://mobile.twitter.com/compose/tweet';
        emulateSend('tweetapp:sent-tweet', url);
        eq(window.location.href, url);
    });

    it('finds previous tweet ID and sets in_reply_to query param on tweetapp:sent-tweet', async function () {
        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:action-after-tweet', 'reply previous');

        let url: string | undefined;
        function setHrefSpy() {
            return new Promise<void>(resolve => {
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

    it('searches tweet button with 4s timeout', async function () {
        this.timeout(10000); // Timeout is 4 seconds
        const start = Date.now();

        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:action-after-tweet', 'reply previous');

        let url: string | undefined;
        function setHrefSpy() {
            return new Promise<void>(resolve => {
                (global as any).window.location = {
                    set href(u: string) {
                        url = u;
                        resolve();
                    },
                };
            });
        }
        const hrefWasSet = setHrefSpy();

        (global as any).document = new JSDOM('').window.document;

        const twUrl = 'https://mobile.twitter.com/compose/tweet';
        emulateSend('tweetapp:sent-tweet', twUrl);

        await hrefWasSet;
        const elapsedMs = Date.now() - start;
        eq(url, twUrl);
        ok(elapsedMs > 4000, `${elapsedMs}`);
    });

    it('opens given URL on tweetapp:open', function () {
        // Navigation is not implemented in jsdom
        (global as any).window.location = {};
        const url = 'https://mobile.twitter.com/compose/tweet?text=hello';
        emulateSend('tweetapp:open', url);
        eq(window.location.href, url);
    });

    it('sets login name to user name <input> on tweetapp:login', function () {
        const window = new JSDOM(`
            <input autocomplete="username"/>
        `).window;
        // JSDOM does not support `document.execCommand` since the method was removed from spec
        const execCommand = sinon.fake();
        (window.document as any).execCommand = execCommand;
        (global as any).document = window.document;

        emulateSend('tweetapp:screen-name', 'foo');
        emulateSend('tweetapp:login');

        const input = document.querySelector('input[autocomplete="username"]') as HTMLInputElement | null;
        ok(input);

        ok(execCommand.called);
        eq(execCommand.lastCall.args, ['insertText', false, 'foo']);
    });

    it('does not set login name to user name <input> on tweetapp:login when screen name is unknown or <input> is not found', function () {
        (global as any).document = new JSDOM(`
            <input autocomplete="username"/>
        `).window.document;

        emulateSend('tweetapp:login');

        const input = document.querySelector('input[autocomplete="username"]') as HTMLInputElement | null;
        ok(input);
        eq(input.value, '');

        input.name = 'foooo';
        emulateSend('tweetapp:login'); // Should not raise an error
    });

    it('does nothing when button is not found', function () {
        (global as any).document = new JSDOM('<div role="button" tabIndex="0">Foooo!!!!!</div>').window.document;
        const click = sinon.fake();
        (document.getElementsByTagName('DIV')[0] as HTMLDivElement).click = click;
        emulateSend('tweetapp:click-tweet-button');
        ok(!click.called);
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
        it(`finds tweet button from "${html}" on tweetapp:click-tweet-button IPC message`, function () {
            (global as any).document = new JSDOM(html).window.document;

            const click = sinon.fake();
            (document.getElementsByTagName('DIV')[0] as HTMLDivElement).click = click;

            emulateSend('tweetapp:click-tweet-button');
            ok(click.calledOnce);
        });
    }

    for (const [what, html] of [
        [
            'data-testid',
            `
                <div role="button" tabIndex="0"></div>
                <div id="back" role="button" tabIndex="0" aria-label="Back"></div>
                <div id="discard" data-testid="confirmationSheetCancel"></div>
                <div id="save" data-testid="confirmationSheetConfirm"></div>
            `,
        ],
        [
            'English texts',
            `
                <div role="button" tabIndex="0"></div>
                <div id="back" role="button" tabIndex="0" aria-label="Back"></div>
                <div id="discard" role="button" tabIndex="0">Discard</div>
                <div id="save" role="button" tabIndex="0">Save</div>
            `,
        ],
        [
            'Japanese texts',
            `
                <div role="button" tabIndex="0"></div>
                <div id="back" role="button" tabIndex="0" aria-label="戻る"></div>
                <div id="discard" role="button" tabIndex="0">破棄</div>
                <div id="save" role="button" tabIndex="0">保存</div>
            `,
        ],
    ]) {
        it(`finds "Discard" and "Save" buttons with ${what} on tweetapp:cancel-tweet IPC message`, function () {
            (global as any).document = new JSDOM(html).window.document;

            const backClick = sinon.fake();
            (document.getElementById('back') as HTMLDivElement).click = backClick;

            const discardListener = sinon.fake();
            (document.getElementById('discard') as HTMLDivElement).addEventListener = discardListener;

            const saveListener = sinon.fake();
            (document.getElementById('save') as HTMLDivElement).addEventListener = saveListener;

            emulateSend('tweetapp:cancel-tweet');
            ok(discardListener.calledOnce);
            eq(discardListener.lastCall.args[0], 'click');
            ok(saveListener.calledOnce);
            eq(saveListener.lastCall.args[0], 'click');
        });
    }

    it('sends tweetapp:reset-window message when "Discard" and "Save" buttons are not found on tweetapp:cancel-tweet assuming no text in textarea', function () {
        const htmlOnlyBackExists = '<div id="back" role="button" tabIndex="0" aria-label="Back"></div>';
        (global as any).document = new JSDOM(htmlOnlyBackExists).window.document;
        emulateSend('tweetapp:cancel-tweet');
        ok(ipcRenderer.send.calledOnce);
        eq(ipcRenderer.send.lastCall.args, ['tweetapp:reset-window']);
    });

    it('does nothing when no "Back" button is found on tweetapp:cancel-tweet IPC message', function () {
        (global as any).document = new JSDOM('').window.document;
        emulateSend('tweetapp:cancel-tweet');
        ok(!ipcRenderer.send.called);
    });

    it('sends IPC message to main process when online status changed', function () {
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

    it('rejects ESC key since it navigates to home timeline at tweet form', function () {
        const calls = (window as any).addEventListener.getCalls();
        const onKeydown = calls.find((c: any) => c.args[0] === 'keydown').args[1];
        const stopPropagation = sinon.fake();

        onKeydown({
            key: 'A',
            stopPropagation,
        });
        ok(!stopPropagation.called);

        onKeydown({
            key: 'Escape',
            stopPropagation,
        });
        ok(stopPropagation.called);
    });
});
