import { deepStrictEqual as eq, notDeepStrictEqual as neq, ok } from 'assert';
import sinon = require('sinon');
import Lifecycle from '../../main/lifecycle';
import { reset } from './mock';

describe('Lifecycle', function() {
    beforeEach(function() {
        reset();
    });

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

    it('switches account reopens window for next account', async function() {
        const cfg = { default_account: 'foo', other_accounts: ['bar', 'piyo'] };
        const opts = { text: '' };
        const life = new Lifecycle(cfg, opts);
        life.runUntilQuit();
        await waitForWindowOpen(life);

        for (const name of ['bar', 'piyo', 'foo']) {
            let prevWindowClosed = false;
            (life as any).currentWin.win.once('closed', () => {
                prevWindowClosed = true;
            });

            await life.switchAccount(name);

            ok(prevWindowClosed, name);
            neq((life as any).currentWin.win, null, name);
            eq((life as any).currentWin.screenName, name);
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
});