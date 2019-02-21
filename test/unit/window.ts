import * as fs from 'fs';
import * as path from 'path';
import { deepStrictEqual as eq, notDeepStrictEqual as neq, ok, fail } from 'assert';
import TweetWindow from '../../main/window';
import Ipc from '../../main/ipc';
import { appDir, reset } from './mock';

const { ipcMain, dialog, shell } = require('electron') as any; // mocked

describe('TweetWindow', function() {
    beforeEach(function() {
        reset();
    });

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
        await w.openNewTweet('this is test');
        const win = (w as any).win;
        neq(win, null);
        const contents = win.webContents;

        // Get IPC listener for 'tweetapp:prev-tweet-id'
        let listener: Function | undefined;
        {
            const calls = ipcMain.on.getCalls();
            for (const call of calls) {
                if (call.args[0] === 'tweetapp:prev-tweet-id') {
                    listener = call.args[1];
                    break;
                }
            }
            if (listener === undefined) {
                fail(JSON.stringify(calls));
                return;
            }
        }

        listener(null, '114514');
        const opened = w.openReply();
        contents.emit('dom-ready');
        await opened;

        ok(contents.send.called);

        let url: string | undefined;
        {
            const calls = contents.send.getCalls();
            for (const call of calls.reverse()) {
                if (call.args[0] === 'tweetapp:open') {
                    url = call.args[1];
                    break;
                }
            }
            if (url === undefined) {
                fail(JSON.stringify(calls, null, 2));
            }
        }

        eq(url, 'https://mobile.twitter.com/compose/tweet?in_reply_to=114514');
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

    // TODO: close
    // TODO: action after tweet (including wantToQuit)
    // TODO: switch account
});
