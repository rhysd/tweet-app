import * as fs from 'fs';
import * as path from 'path';
import { deepStrictEqual as eq, notDeepStrictEqual as neq, ok } from 'assert';
import sinon = require('sinon');
import TweetWindow from '../main/window';
import Ipc from '../main/ipc';
import type { Config } from '../types/common';
import { appDir, reset } from './mock';

type Spy = sinon.SinonSpy;

const { ipcMain, dialog, shell, app } = require('electron') as any; // mocked

function findCall(spy: Spy, pred: (call: sinon.SinonSpyCall) => boolean): sinon.SinonSpyCall {
    const calls = spy.getCalls();
    const call = calls.find(pred);
    ok(call, JSON.stringify(calls));
    return call;
}

describe('TweetWindow', function () {
    beforeEach(reset);

    after(function () {
        const config = path.join(appDir, 'config.json');
        try {
            fs.unlinkSync(config);
        } catch (e) {
            // ignore
        }
    });

    it('initializes screen name at constructor', function () {
        const dummy = {} as any;
        for (const n of [undefined, 'foo', '@foo']) {
            const w = new TweetWindow(n, dummy, dummy, dummy, dummy);
            const expected = n === undefined ? undefined : 'foo';
            eq(w.screenName, expected);
        }
    });

    it('opens window for new tweet with no query', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);

        // Default properties
        eq(win.opts.width, 600);
        eq(win.opts.height, 600);
        eq(win.opts.autoHideMenuBar, true);

        const contents = win.webContents;
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet');
        eq(contents.send.getCall(0).args, ['tweetapp:screen-name', 'foo']);
        ok(contents.session.webRequest.onCompleted.calledOnce);
        ok(contents.options, `Options: ${JSON.stringify(contents.options)}`);
        ok(typeof contents.options.userAgent === 'string', `Options: ${JSON.stringify(contents.options)}`);
    });

    it('opens window multiple times', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);
        const contents = win.webContents;

        for (let i = 0; i < 10; i++) {
            const willOpen = w.openNewTweet();
            contents.emit('dom-ready');
            await willOpen;
        }

        const callArgs = contents.send
            .getCalls()
            .map((c: any) => c.args)
            .filter((a: string[]) => a[0] === 'tweetapp:open');
        for (const args of callArgs) {
            eq(args[1], 'https://mobile.twitter.com/compose/tweet');
        }
    });

    it('opens window for new tweet with hashtags', async function () {
        const ipc = new Ipc();
        const opts = {
            hashtags: ['foo', 'bar'],
            text: '',
        };

        const w = new TweetWindow('@foo', {}, ipc, opts, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);

        const contents = win.webContents;
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet?hashtags=foo%2Cbar');
    });

    it('opens window for new tweet with text', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet('this is test');
        const win = (w as any).win;
        neq(win, null);

        const contents = win.webContents;
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet?text=this%20is%20test');
    });

    it('opens window for reply to previous tweet', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);
        const contents = win.webContents;

        // Get IPC listener for 'tweetapp:prev-tweet-id'
        let call = findCall(ipcMain.on, c => c.args[0] === 'tweetapp:prev-tweet-id');
        const listener = call.args[1];

        listener(null, '114514');
        const opened = w.openReply();
        contents.emit('dom-ready');
        await opened;

        ok(contents.send.called);

        call = findCall(contents.send, c => c.args[0] === 'tweetapp:open');
        const url = call.args[1];

        eq(url, 'https://mobile.twitter.com/compose/tweet?in_reply_to=114514');

        // Open tweet window again
        await w.openNewTweet();
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet');
    });

    it('opens window for reply to previous tweet with text', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);
        const contents = win.webContents;

        w.prevTweetId = '114514';

        const opened = w.openReply('this is text');
        contents.emit('dom-ready');
        await opened;

        ok(contents.send.called);

        const call = findCall(contents.send, c => c.args[0] === 'tweetapp:open');
        const url = call.args[1];

        eq(url, 'https://mobile.twitter.com/compose/tweet?text=this%20is%20text&in_reply_to=114514');
    });

    it('shows dialog to require default_account config when no screen name is set and reply is requested', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow(undefined, {}, ipc, { text: '' }, {} as any);
        eq(w.screenName, undefined);
        const willOpenAfterDialogClosed = w.openReply();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts] = call.args;
        eq(opts.title, 'Config is required');

        await willOpenAfterDialogClosed;

        eq(shell.openPath.callCount, 1);
        const file = shell.openPath.lastCall.args[0];
        ok(file.endsWith('config.json'), file);
    });

    it('shows dialog to require default_account config and do nothing when clicking OK', async function () {
        // index of buttons. emulate 'OK' button was pressed
        dialog.showMessageBox = sinon.fake.returns(Promise.resolve({ response: 1 }));

        const ipc = new Ipc();
        const w = new TweetWindow(undefined, {}, ipc, { text: '' }, {} as any);
        eq(w.screenName, undefined);
        const willOpenAfterDialogClosed = w.openReply();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts] = call.args;
        eq(opts.title, 'Config is required');

        await willOpenAfterDialogClosed;

        eq(shell.openPath.callCount, 0);
    });

    it('shows dialog to notify a new tweet must be posted before reply', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
        const willOpenAfterDialogClosed = w.openReply();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts] = call.args;
        eq(opts.title, 'Cannot reply to previous tweet');

        await willOpenAfterDialogClosed;
    });

    it('closes window and cleanup IPC receiver', async function () {
        const ipc: any = new Ipc();
        ipc.detach = sinon.fake();
        ipc.forget = sinon.fake();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const contents = (w as any).win.webContents;
        await w.close();
        eq((w as any).win, null);

        ok(ipc.detach.called);
        ok(ipc.forget.called);

        if (process.platform === 'darwin') {
            ok(app.hide.called);
        }

        eq(ipc.detach.lastCall.args[0], contents);
        const calls = ipc.forget.getCalls();
        ok(calls.some((c: any) => c.args[0] === 'tweetapp:prev-tweet-id'));
        ok(calls.some((c: any) => c.args[0] === 'tweetapp:online-status'));
        await w.didClose;

        await w.close();
    });

    it('prepare next tweet when action after tweet is tweet or reply', async function () {
        for (const action of ['new tweet', 'reply previous'] as const) {
            const config = {
                after_tweet: action,
            };
            const ipc = new Ipc();
            const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
            await w.openNewTweet();

            const contents = (w as any).win.webContents;
            const call = findCall(contents.send, c => c.args[0] === 'tweetapp:action-after-tweet');
            ok(call);
            eq(call.args[1], action);

            ok(contents.session.webRequest.onCompleted.called);
            const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
            callback({
                url: 'https://mobile.twitter.com/i/api/graphql/hoge/CreateTweet',
                statusCode: 200,
                method: 'POST',
                fromCache: false,
            });

            const ipcCall = findCall(contents.send, c => c.args[0] === 'tweetapp:sent-tweet');
            ok(ipcCall);
            eq(ipcCall.args[1], 'https://mobile.twitter.com/compose/tweet');
        }
    });

    it('closes window when action after tweet is close', async function () {
        const config = {
            after_tweet: 'close',
        } as const;
        const ipc = new Ipc();
        const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
        await w.openNewTweet();

        const contents = (w as any).win.webContents;
        const call = findCall(contents.send, c => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'close');

        ok(contents.session.webRequest.onCompleted.called);
        const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
        callback({
            url: 'https://mobile.twitter.com/i/api/graphql/hoge/CreateTweet',
            statusCode: 200,
            method: 'POST',
            fromCache: false,
        });

        eq((w as any).win, null);
        await w.didClose;
    });

    it('quits when action after tweet is quit', async function () {
        const config = {
            after_tweet: 'quit',
        } as const;
        const ipc = new Ipc();
        const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
        await w.openNewTweet();

        const contents = (w as any).win.webContents;
        const call = findCall(contents.send, c => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'quit');

        ok(contents.session.webRequest.onCompleted.called);
        const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
        callback({
            url: 'https://mobile.twitter.com/i/api/graphql/hoge/CreateTweet',
            statusCode: 200,
            method: 'POST',
            fromCache: false,
        });

        await w.wantToQuit;
    });

    it('does nothing when /i/api/graphql/hoge/CreateTweet API fails', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();

        const contents = (w as any).win.webContents;

        ok(contents.session.webRequest.onCompleted.called);
        const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
        callback({
            url: 'https://mobile.twitter.com/i/api/graphql/hoge/CreateTweet',
            statusCode: 400,
            method: 'POST',
            fromCache: false,
        });

        neq((w as any).win, null);
        ok(contents.url);
    });

    it('updates options for second instance', async function () {
        const config = {
            after_tweet: 'quit',
        } as const;
        const opts = {
            hashtags: ['foo', 'bar'],
            text: '',
        };
        const ipc = new Ipc();
        const w = new TweetWindow('foo', config, ipc, opts, {} as any);
        w.updateOptions({
            afterTweet: 'quit',
            hashtags: ['aaa'],
            text: '',
        });

        await w.openNewTweet();
        const contents = (w as any).win.webContents;

        // hashtags was updated
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet?hashtags=aaa');

        // action after tweet was updated
        const call = findCall(contents.send, c => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'quit');
    });

    it('reflects window configuration to BrowserWindow options', async function () {
        const config: Config = {
            window: {
                width: 400,
                zoom: 0.7,
                auto_hide_menu_bar: false,
                visible_on_all_workspaces: true,
            },
        };
        const w = new TweetWindow('foo', config, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const opts = (w as any).win.opts;

        eq(opts.width, 400);
        eq(opts.height, 600);
        eq(opts.autoHideMenuBar, false);
        eq(opts.webPreferences.zoomFactor, 0.7);
        ok((w as any).win.setVisibleOnAllWorkspaces.lastCall.args[0]);
    });

    it('shows "Network unavailable" page on offline and reopens page again when it is back to online', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = findCall(ipcMain.on, c => c.args[0] === 'tweetapp:online-status');
        ok(call);
        const callback = call.args[1];
        callback('tweetapp:online-status', 'offline');

        let url = (w as any).win.webContents.url;
        ok(url.endsWith('offline.html'), url);

        callback('tweetapp:online-status', 'online');

        url = (w as any).win.webContents.url;
        eq(url, 'https://mobile.twitter.com/compose/tweet');
    });

    it('does nothing when online status does not change on tweetapp:online-status message', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = findCall(ipcMain.on, c => c.args[0] === 'tweetapp:online-status');
        ok(call);
        const callback = call.args[1];

        let prevUrl = (w as any).win.webContents.url;
        callback('tweetapp:online-status', 'online');
        eq((w as any).win.webContents.url, prevUrl);

        callback('tweetapp:online-status', 'offline');

        prevUrl = (w as any).win.webContents.url;
        callback('tweetapp:online-status', 'offline');
        eq((w as any).win.webContents.url, prevUrl);
    });

    it('does nothing when no window is opened on online status change', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = findCall(ipcMain.on, c => c.args[0] === 'tweetapp:online-status');
        ok(call);
        const callback = call.args[1];

        await w.close();
        eq((w as any).win, null);

        callback('tweetapp:online-status', 'offline');
        eq((w as any).win, null);
    });

    it('shows dialog to require default_account config when no screen name is set and showing previous tweet is requested', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow(undefined, {}, ipc, { text: '' }, {} as any);
        eq(w.screenName, undefined);

        const dialogClosed = w.openPreviousTweet();
        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;
        const [opts] = call.args;
        eq(opts.title, 'Config is required');
        ok(opts.message.includes('open previous tweet page'), opts.message);

        await dialogClosed;
    });

    it('shows dialog to notify a new tweet must be posted before opening previous tweet', async function () {
        const ipc = new Ipc();
        const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
        const dialogClosed = w.openPreviousTweet();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts] = call.args;
        eq(opts.title, 'Cannot open previous tweet page');

        await dialogClosed;
    });

    it('opens previous tweet page if screen name and previous tweet ID is set', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        const contents = win.webContents;

        win.isMinimized = sinon.fake.returns(true);
        w.prevTweetId = '114514';

        const opened = w.openPreviousTweet();
        contents.emit('dom-ready');
        await opened;

        ok(contents.send.called);
        const call = (contents.send as Spy)
            .getCalls()
            .reverse()
            .find(c => c.args[0] === 'tweetapp:open');
        ok(call);
        eq(call.args, ['tweetapp:open', 'https://mobile.twitter.com/foo/status/114514']);
        ok(win.restore.called);
    });

    for (const [doing, url] of [
        ['deleting', 'https://api.twitter.com/graphql/hoge/DeleteTweet'],
        ['scheduling', 'https://api.twitter.com/graphql/hoge/CreateScheduledTweet'],
    ]) {
        it(`opens "New Tweet" page again after ${doing} a tweet to prevent back to home timeline`, async function () {
            const ipc = new Ipc();
            const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
            await w.openNewTweet();

            const contents = (w as any).win.webContents;

            ok(contents.session.webRequest.onCompleted.called);
            const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
            callback({
                url,
                statusCode: 200,
                method: 'POST',
                fromCache: false,
            });

            const ipcCall = findCall(contents.send, c => c.args[0] === 'tweetapp:open');
            ok(ipcCall);
            eq(ipcCall.args[1], 'https://mobile.twitter.com/compose/tweet');
            eq(w.prevTweetId, null);
        });
    }

    it('prevents navigation when the URL is not mobile.twitter.com', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();

        const wc = (w as any).win.webContents;
        let e = {
            preventDefault: sinon.fake(),
        };

        wc.emit('will-navigate', e, 'https://example.com');
        ok(e.preventDefault.called);

        e = {
            preventDefault: sinon.fake(),
        };

        wc.emit('will-navigate', e, 'https://mobile.twitter.com/foo/status/114514');
        ok(!e.preventDefault.called);
    });

    it('prevents creating a new window', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();

        const wc = (w as any).win.webContents;
        ok(wc.setWindowOpenHandler.called);
        const callback = wc.setWindowOpenHandler.lastCall.args[0];
        const response = callback({});
        eq(response.action, 'deny');
    });

    it('injects CSS to prevent some links from displaying', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();

        const wc = (w as any).win.webContents;
        let insertCSS = sinon.fake();
        wc.insertCSS = insertCSS;

        wc.emit('did-finish-load');

        ok(insertCSS.called);
        let css = insertCSS.lastCall.args[0];
        ok(css.includes('display: none !important;'), css);
        ok(css.includes('[href="/"]'), css);
        ok(css.includes('[aria-label="Back"]'), css);
        ok(css.includes('[aria-label="戻る"]'), css);

        (w as any).screenName = 'foo';
        insertCSS = sinon.fake();
        wc.insertCSS = insertCSS;

        wc.emit('did-finish-load');

        ok(insertCSS.called);
        css = insertCSS.lastCall.args[0];
        ok(css.includes('[href="/foo"]'), css);
    });

    it('detects login at onBeforeRequest hook', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();

        const wc = (w as any).win.webContents;
        const callback = wc.session.webRequest.onBeforeRequest.lastCall.args[1];

        function loginIpcSent() {
            const called = !!(wc.send as Spy).getCalls().find(c => c.args[0] === 'tweetapp:login');
            wc.send = sinon.fake(); // Clear
            return called;
        }

        // Detect referrer is /login URL
        let cb = sinon.fake();
        callback({ url: 'https://api.twitter.com/1.1/onboarding/task.json?flow_name=login' }, cb);
        ok(cb.called);
        ok(loginIpcSent());
        eq(wc.session.webRequest.onBeforeRequest.lastCall.args[0], null); // listener was removed

        // Tweet is posted, it means it is already in login state
        wc.session.webRequest.onBeforeRequest = sinon.fake();
        cb = sinon.fake();
        callback(
            {
                url: 'https://api.twitter.com/graphql/hogeCreateTweet',
                referrer: 'https://mobile.twitter.com/compose/tweet',
            },
            cb,
        );
        ok(cb.called);
        ok(!loginIpcSent());
        eq(wc.session.webRequest.onBeforeRequest.lastCall.args[0], null); // listener was removed
    });

    describe('Permission request handler', function () {
        let webContents: any;
        let handler: (...args: any[]) => any;

        beforeEach(async function () {
            const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
            await w.openNewTweet();
            webContents = (w as any).win.webContents;
            webContents.url = 'https://mobile.twitter.com/compose/tweet';
            handler = webContents.session.setPermissionRequestHandler.lastCall.args[0];
        });

        it('rejects some permissions without asking to user', function () {
            for (const perm of ['fullscreen', 'notification']) {
                const cb = sinon.fake();
                handler(webContents, perm, cb, {});
                ok(cb.called);
                ok(!cb.lastCall.args[0]);
            }
        });

        it('rejects any permission from outside mobile.twitter.com', function () {
            webContents.url = 'https:/example.com'; // This changes return value of webContents.getURL()
            const cb = sinon.fake();
            handler(webContents, 'media', cb, {});
            ok(cb.called);
            ok(!cb.lastCall.args[0]);
        });

        it('rejects when user clicks "Reject" button of dialog', async function () {
            for (const perm of ['media', 'geolocation']) {
                // 1 means button at index 1 'Reject' was clicked
                dialog.showMessageBox = sinon.fake.returns(Promise.resolve({ response: 1 }));

                const p = new Promise(resolve => {
                    handler(webContents, perm, resolve, {});
                });

                ok(dialog.showMessageBox.called);
                eq(dialog.showMessageBox.lastCall.args[0].title, 'Permission was requested');
                const msg = dialog.showMessageBox.lastCall.args[0].message;
                ok(msg.includes(perm), msg);

                const accepted = (await p) as boolean;
                ok(!accepted);
            }
        });

        it('accepts when user clicks "Accept" button of dialog', async function () {
            for (const perm of ['media', 'geolocation']) {
                const p = new Promise(resolve => {
                    handler(webContents, perm, resolve, {});
                });

                ok(dialog.showMessageBox.called);

                const accepted = (await p) as boolean;
                ok(accepted);
            }
        });
    });

    it('rejects window title update', async function () {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();

        const preventDefault = sinon.fake();
        (w as any).win.emit('page-title-updated', { preventDefault });
        ok(preventDefault.called);
    });

    it('unlinks tweet text', async function () {
        const w = new TweetWindow('@foo', {}, new Ipc(), { text: '' }, {} as any);

        // Do nothing when window is not open
        w.unlinkSelection('');

        await w.openNewTweet();
        const webContents = (w as any).win.webContents;

        // Nothing unlinked. Text is not changed
        w.unlinkSelection('this is test');
        ok(!webContents.insertText.called);

        // Test unlinking things
        w.unlinkSelection('foo! @name #tag');
        ok(webContents.insertText.calledOnce);
        const unlinked = webContents.insertText.lastCall.args[0];
        eq(unlinked, 'foo! @\u200Bname #\u200Btag');
    });

    it('resets window when receiving tweetapp:reset-window message', async function () {
        const ipc = new Ipc();

        const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const webContents = (w as any).win.webContents;

        const call = findCall(ipcMain.on, c => c.args[0] === 'tweetapp:reset-window');
        ok(call);
        const onResetWindow = call.args[1];
        const willReset = onResetWindow();
        webContents.emit('dom-ready');
        await willReset;
        ok(w.isOpen());

        // tweetapp:open is sent from main to renderer because tweetapp:reset-window forces to reopen
        // the window
        const sent = findCall(webContents.send, call => call.args[0] === 'tweetapp:open');
        ok(sent);
        const url = sent.args[1]; // Argument of 'tweetapp:open' message on calling open()
        eq(url, 'https://mobile.twitter.com/compose/tweet');
    });
});
