import * as fs from 'fs';
import * as path from 'path';
import { deepStrictEqual as eq, notDeepStrictEqual as neq, ok } from 'assert';
import sinon = require('sinon');
import TweetWindow from '../../main/window';
import Ipc from '../../main/ipc';
import { appDir, reset } from './mock';

const { ipcMain, dialog, shell } = require('electron') as any; // mocked

describe('TweetWindow', function() {
    beforeEach(reset);

    after(function() {
        const config = path.join(appDir, 'config.json');
        try {
            fs.unlinkSync(config);
        } catch (e) {}
    });

    it('initializes screen name at constructor', function() {
        const dummy = {} as any;
        for (const n of [undefined, 'foo', '@foo']) {
            const w = new TweetWindow(n, dummy, dummy, dummy, dummy);
            const expected = n === undefined ? undefined : 'foo';
            eq(w.screenName, expected);
        }
    });

    it('opens window for new tweet', async function() {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);

        const contents = win.webContents;
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet');
        eq(contents.send.getCall(0).args, ['tweetapp:screen-name', 'foo']);
        ok(contents.session.webRequest.onCompleted.calledOnce);
    });

    it('opens window multiple times', async function() {
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

    it('opens window for new tweet with hashtags', async function() {
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

    it('opens window for new tweet with text', async function() {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet('this is test');
        const win = (w as any).win;
        neq(win, null);

        const contents = win.webContents;
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet?text=this%20is%20test');
    });

    it('opens window for reply to previous tweet', async function() {
        const ipc = new Ipc();
        const w = new TweetWindow('@foo', {}, ipc, { text: '' }, {} as any);
        await w.openNewTweet();
        const win = (w as any).win;
        neq(win, null);
        const contents = win.webContents;

        // Get IPC listener for 'tweetapp:prev-tweet-id'
        let calls = ipcMain.on.getCalls();
        let call = calls.find((c: any) => c.args[0] === 'tweetapp:prev-tweet-id');
        ok(call, JSON.stringify(calls));
        const listener = call.args[1];

        listener(null, '114514');
        const opened = w.openReply();
        contents.emit('dom-ready');
        await opened;

        ok(contents.send.called);

        calls = contents.send.getCalls();
        call = calls.find((c: any) => c.args[0] === 'tweetapp:open');
        ok(call, JSON.stringify(calls));
        const url = call.args[1];

        eq(url, 'https://mobile.twitter.com/compose/tweet?in_reply_to=114514');

        // Open tweet window again
        await w.openNewTweet();
        eq(contents.url, 'https://mobile.twitter.com/compose/tweet');
    });

    it('shows dialog to require default_account config when no screen name is set and reply is requested', async function() {
        const ipc = new Ipc();
        const w = new TweetWindow(undefined, {}, ipc, { text: '' }, {} as any);
        eq(w.screenName, undefined);
        const willOpenAfterDialogClosed = w.openReply();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts, callback] = call.args;
        eq(opts.title, 'Config is required');
        callback(0 /*: index of buttons. emulate 'Edit Config' button was pressed*/);

        await willOpenAfterDialogClosed;

        eq(shell.openItem.callCount, 1);
        const file = shell.openItem.lastCall.args[0];
        ok(file.endsWith('config.json'), file);
    });

    it('shows dialog to notify a new tweet must be posted before reply', async function() {
        const ipc = new Ipc();
        const w = new TweetWindow('foo', {}, ipc, { text: '' }, {} as any);
        const willOpenAfterDialogClosed = w.openReply();

        ok(dialog.showMessageBox.calledOnce);
        const call = dialog.showMessageBox.lastCall;

        const [opts, callback] = call.args;
        eq(opts.title, 'Post a new tweet before reply');
        callback(0);

        await willOpenAfterDialogClosed;
    });

    it('closes window and cleanup IPC receiver', async function() {
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

        eq(ipc.detach.lastCall.args[0], contents);
        const calls = ipc.forget.getCalls();
        ok(calls.some((c: any) => c.args[0] === 'tweetapp:prev-tweet-id'));
        ok(calls.some((c: any) => c.args[0] === 'tweetapp:online-status'));
        await w.didClose;

        await w.close();
    });

    it('prepare next tweet when action after tweet is tweet or reply', async function() {
        for (const action of ['new tweet' as 'new tweet', 'reply previous' as 'reply previous']) {
            const config = {
                after_tweet: action,
            };
            const ipc = new Ipc();
            const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
            await w.openNewTweet();

            const contents = (w as any).win.webContents;
            const call = contents.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:action-after-tweet');
            ok(call);
            eq(call.args[1], action);

            ok(contents.session.webRequest.onCompleted.called);
            const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
            callback({
                statusCode: 200,
                method: 'POST',
                fromCache: false,
            });

            const ipcCall = contents.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:sent-tweet');
            ok(ipcCall);
            eq(ipcCall.args[1], 'https://mobile.twitter.com/compose/tweet');
        }
    });

    it('closes window when action after tweet is close', async function() {
        const config = {
            after_tweet: 'close' as 'close',
        };
        const ipc = new Ipc();
        const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
        await w.openNewTweet();

        const contents = (w as any).win.webContents;
        const call = contents.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'close');

        ok(contents.session.webRequest.onCompleted.called);
        const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
        callback({
            statusCode: 200,
            method: 'POST',
            fromCache: false,
        });

        eq((w as any).win, null);
        await w.didClose;
    });

    it('quits when action after tweet is quit', async function() {
        const config = {
            after_tweet: 'quit' as 'quit',
        };
        const ipc = new Ipc();
        const w = new TweetWindow('foo', config, ipc, { text: '' }, {} as any);
        await w.openNewTweet();

        const contents = (w as any).win.webContents;
        const call = contents.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'quit');

        ok(contents.session.webRequest.onCompleted.called);
        const callback = contents.session.webRequest.onCompleted.lastCall.args[1];
        callback({
            statusCode: 200,
            method: 'POST',
            fromCache: false,
        });

        await w.wantToQuit;
    });

    it('can update options for second instance', async function() {
        const config = {
            after_tweet: 'quit' as 'quit',
        };
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
        const call = contents.send.getCalls().find((c: any) => c.args[0] === 'tweetapp:action-after-tweet');
        ok(call);
        eq(call.args[1], 'quit');
    });

    it('reflects window configuration to BrowserWindow options', async function() {
        const config = {
            window: {
                width: 400,
                height: 380,
                zoom: 0.7,
            },
        };
        const w = new TweetWindow('foo', config, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const opts = (w as any).win.opts;

        eq(opts.width, 400);
        eq(opts.height, 380);
        eq(opts.webPreferences.zoomFactor, 0.7);
    });

    it('shows "Network unavailable" page on offline and reopens page again when it is back to online', async function() {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = ipcMain.on.getCalls().find((c: any) => c.args[0] === 'tweetapp:online-status');
        ok(call);
        const callback = call.args[1];
        callback('tweetapp:online-status', 'offline');

        let url = (w as any).win.webContents.url;
        ok(url.endsWith('offline.html'), url);

        callback('tweetapp:online-status', 'online');

        url = (w as any).win.webContents.url;
        eq(url, 'https://mobile.twitter.com/compose/tweet');
    });

    it('does nothing when online status does not change on tweetapp:online-status message', async function() {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = ipcMain.on.getCalls().find((c: any) => c.args[0] === 'tweetapp:online-status');
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

    it('does nothing when no window is opened on online status change', async function() {
        const w = new TweetWindow('foo', {}, new Ipc(), { text: '' }, {} as any);
        await w.openNewTweet();
        const call = ipcMain.on.getCalls().find((c: any) => c.args[0] === 'tweetapp:online-status');
        ok(call);
        const callback = call.args[1];

        await w.close();
        eq((w as any).win, null);

        callback('tweetapp:online-status', 'offline');
        eq((w as any).win, null);
    });
});
