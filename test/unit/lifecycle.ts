import { deepStrictEqual as eq, notDeepStrictEqual as neq, ok } from 'assert';
import sinon = require('sinon');
import Lifecycle from '../../main/lifecycle';
import { reset } from './mock';

const { globalShortcut } = require('electron') as any; // mocked

describe('Lifecycle', function() {
    beforeEach(reset);

    function waitForWindowOpen(lifecycle: Lifecycle) {
        return new Promise(resolve => {
            const ipc = (lifecycle as any).ipc;
            const send = ipc.send.bind(ipc);
            (lifecycle as any).ipc.send = function(...args: any[]) {
                if (args[0] === 'tweetapp:action-after-tweet') {
                    resolve();
                }
                send(...args);
            };
        });
    }

    it('creates window instance for default account but does not open yet', function() {
        const cfg = { default_account: 'foo' };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);
        const win = (life as any).currentWin;
        ok(win);
        eq(win.screenName, 'foo');
    });

    it('opens window when starting its lifecycle', async function() {
        const cfg = { default_account: 'foo', other_accounts: ['bar'] };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);
        life.runUntilQuit();
        await waitForWindowOpen(life);
        neq((life as any).currentWin.win, null);
        eq((life as any).currentWin.screenName, 'foo');
    });

    it('run until quit after start', async function() {
        const cfg = { default_account: 'foo', other_accounts: ['bar'] };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);

        const dispose = sinon.fake();
        (life as any).ipc.dispose = dispose;

        const onQuit = life.runUntilQuit();
        await waitForWindowOpen(life);
        await life.quit();

        eq((life as any).currentWin.win, null);
        ok(dispose.calledOnce);
        await onQuit;
        await life.didQuit;
    });

    it('quits when window wants to quit', async function() {
        const cfg = {
            default_account: 'foo',
            other_accounts: ['bar'],
            after_tweet: 'quit' as 'quit',
        };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);

        const onQuit = life.runUntilQuit();
        await waitForWindowOpen(life);

        // Get callback of onCompleted which handles action after quit
        const callback = (life as any).currentWin.win.webContents.session.webRequest.onCompleted.lastCall.args[1];

        callback({
            statusCode: 200,
            method: 'POST',
            fromCache: false,
        });

        await onQuit;
        await life.didQuit;
    });

    it('quits when window is closed if quit_on_close is set to true', async function() {
        const cfg = {
            default_account: 'foo',
            other_accounts: ['bar'],
            after_tweet: 'quit' as 'quit',
            quit_on_close: true,
        };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);

        const onQuit = life.runUntilQuit();
        await waitForWindowOpen(life);

        await (life as any).currentWin.close();

        // App quits
        await onQuit;
        await life.didQuit;
    });

    it('restarts window without new options', async function() {
        const cfg = { default_account: 'foo' };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);

        life.runUntilQuit();
        await waitForWindowOpen(life);

        // With no argument, it just focuses an existing window or reopen a new window
        await life.restart();
        neq((life as any).currentWin.win, null);

        // On Linux or Windows app quits on close
        if (process.platform === 'darwin') {
            // Restart after closing window reopens window
            const prevUrl = (life as any).currentWin.win.webContents.url;
            await (life as any).currentWin.close();
            eq((life as any).currentWin.win, null);
            await life.restart();
            neq((life as any).currentWin.win, null);
            eq((life as any).currentWin.win.webContents.url, prevUrl);
        }

        await life.quit();
        await life.didQuit;
    });

    it('restarts window with new options for second instance', async function() {
        const cfg = { default_account: 'foo' };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);
        const ipc = (life as any).ipc;

        life.runUntilQuit();
        await waitForWindowOpen(life);
        eq((life as any).currentWin.win.webContents.url, 'https://mobile.twitter.com/compose/tweet');

        let send = sinon.fake();
        ipc.send = send;
        let restarted = life.restart({
            text: 'this is test',
        });
        // Reopen website, but not close window
        (life as any).currentWin.win.webContents.emit('dom-ready');
        await restarted;

        let call = send.getCalls().find((c: any) => c.args[0] === 'tweetapp:open');
        ok(call);
        eq(call!.args[1], 'https://mobile.twitter.com/compose/tweet?text=this%20is%20test');

        send = sinon.fake();
        ipc.send = send;
        restarted = life.restart({
            text: '',
            hashtags: ['foo', 'bar'],
        });
        // Reopen website, but not close window
        (life as any).currentWin.win.webContents.emit('dom-ready');
        await restarted;

        call = send.getCalls().find((c: any) => c.args[0] === 'tweetapp:open');
        ok(call);
        eq(call!.args[1], 'https://mobile.twitter.com/compose/tweet?hashtags=foo%2Cbar');

        await life.quit();
        await life.didQuit;
    });

    it('registers and unregisters hot key as global shortcut', async function() {
        const hotkey = 'CmdOrCtrl+Shift+X';
        const cfg = { hotkey };
        const life = new Lifecycle(cfg, { text: '' });
        life.runUntilQuit();
        await waitForWindowOpen(life);

        ok(globalShortcut.register.calledOnce);
        eq(globalShortcut.register.lastCall.args[0], hotkey);

        await life.quit();
        await life.didQuit;

        ok(globalShortcut.unregisterAll.calledOnce);
    });

    describe('Actions', function() {
        it('switches account reopens window for next account', async function() {
            const cfg = { default_account: 'foo', other_accounts: ['bar', 'piyo'] };
            const opts = { text: '' };
            const life = new Lifecycle(cfg, opts);
            life.runUntilQuit();
            await waitForWindowOpen(life);

            let previous = (life as any).currentWin;
            for (let name of ['bar', '@piyo', 'foo']) {
                let prevWindowClosed = false;
                (life as any).currentWin.win.once('closed', () => {
                    prevWindowClosed = true;
                });

                await life.switchAccount(name);

                if (name.startsWith('@')) {
                    name = name.slice(1); // Omit @
                }
                ok(prevWindowClosed, name);
                const current = (life as any).currentWin;
                neq(current, previous);
                neq(current.win, null, name);
                eq(current.screenName, name);
                previous = current;
            }

            // switching to the same account should cause nothing
            let prevWindowClosed = false;
            (life as any).currentWin.win.once('closed', () => {
                prevWindowClosed = true;
            });
            await life.switchAccount('foo');
            ok(!prevWindowClosed);

            await life.quit();
            await life.didQuit;
        });

        it('maintains previous tweet ID even after account switch', async function() {
            const cfg = { default_account: 'foo', other_accounts: ['bar', 'piyo'] };
            const opts = { text: '' };
            const life = new Lifecycle(cfg, opts);
            life.runUntilQuit();
            await waitForWindowOpen(life);

            eq((life as any).currentWin.prevTweetId, null);
            (life as any).currentWin.prevTweetId = '114514';

            await life.switchAccount('bar');

            eq((life as any).currentWin.prevTweetId, null);
            (life as any).currentWin.prevTweetId = '530000';

            await life.switchAccount('foo');
            eq((life as any).currentWin.prevTweetId, '114514');

            await life.switchAccount('bar');
            eq((life as any).currentWin.prevTweetId, '530000');

            await life.quit();
            await life.didQuit;
        });

        it('clicks tweet button via IPC', async function() {
            const life = new Lifecycle({}, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);
            life.clickTweetButton();
            const { send } = (life as any).currentWin.win.webContents;
            ok(send.called);
            eq(send.lastCall.args[0], 'tweetapp:click-tweet-button');
        });

        it('shows "new tweet" window', async function() {
            const life = new Lifecycle({}, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);
            await (life as any).currentWin.close();

            const opened = life.newTweet();
            (life as any).currentWin.win.webContents.emit('dom-ready');
            await opened;

            eq((life as any).currentWin.win.webContents.url, 'https://mobile.twitter.com/compose/tweet');
        });

        it('shows "reply to previous" window', async function() {
            const life = new Lifecycle({ default_account: 'foo' }, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);
            (life as any).currentWin.prevTweetId = '114514';
            await (life as any).currentWin.close();

            const opened = life.replyToPrevTweet();
            (life as any).currentWin.win.webContents.emit('dom-ready');
            await opened;

            eq(
                (life as any).currentWin.win.webContents.url,
                'https://mobile.twitter.com/compose/tweet?in_reply_to=114514',
            );
        });

        it('opens account settings page', async function() {
            const life = new Lifecycle({}, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);

            life.openAccountSettings();
            const { send } = (life as any).currentWin.win.webContents;
            ok(send.called);
            eq(send.lastCall.args, ['tweetapp:open', 'https://mobile.twitter.com/settings/account']);
        });

        it('opens profile page for debugging', async function() {
            const life = new Lifecycle({ default_account: 'foo' }, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);

            life.openProfilePageForDebug();
            const { send } = (life as any).currentWin.win.webContents;
            ok(send.called);
            eq(send.lastCall.args, ['tweetapp:open', 'https://mobile.twitter.com/foo']);
        });

        it('toggles window', async function() {
            const life = new Lifecycle({ default_account: 'foo' }, { text: '' });
            life.runUntilQuit();
            await waitForWindowOpen(life);

            const w = (life as any).currentWin;

            ok(w.isOpen());
            await life.toggleWindow();
            ok(!w.isOpen());
            await life.toggleWindow();
            ok(w.isOpen());
        });
    });
});
