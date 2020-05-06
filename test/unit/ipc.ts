import { deepStrictEqual as eq, ok } from 'assert';
import sinon = require('sinon');
import Ipc from '../../main/ipc';
import { reset } from './mock';

const { ipcMain } = require('electron') as any; // mocked;

class DummySender {
    public send = sinon.fake();
}

describe('Ipc', function () {
    let ipc: Ipc;

    beforeEach(function () {
        ipc = new Ipc();
    });

    describe('sender', function () {
        it('sends IPC message with attached sender', function () {
            const sender: any = new DummySender();
            ipc.attach(sender);
            ipc.send('tweetapp:sent-tweet');
            ipc.send('tweetapp:sent-tweet', 'foo', 'bar', 'piyo');
            ok(sender.send.called);
            const calls = sender.send.getCalls();
            eq(calls[0].args, ['tweetapp:sent-tweet']);
            eq(calls[1].args, ['tweetapp:sent-tweet', 'foo', 'bar', 'piyo']);
        });

        it('does not send IPC message after detach', function () {
            const sender: any = new DummySender();
            ipc.attach(sender);
            ipc.detach(sender);
            ipc.send('tweetapp:sent-tweet');
            ipc.send('tweetapp:sent-tweet', 'foo', 'bar', 'piyo');
            eq(sender.send.getCalls(), []);
        });

        it('does nothing when different sender is specified', function () {
            const sender1: any = new DummySender();
            const sender2: any = new DummySender();
            ipc.attach(sender1);
            ipc.detach(sender2);
            ipc.send('tweetapp:sent-tweet');
            ok(sender1.send.called);
            eq(sender1.send.lastCall.args, ['tweetapp:sent-tweet']);
            ok(!sender2.send.called);
        });
    });

    describe('receiver', function () {
        beforeEach(function () {
            reset();
        });

        it('sets listener as IPC receiver', function () {
            const listener = (_: Event) => {};
            ipc.on('tweetapp:online-status', listener);
            ok(ipcMain.on.calledOnce);
            const call = ipcMain.on.getCalls()[0];
            eq(call.args, ['tweetapp:online-status', listener]);
        });

        it('forgets listener', function () {
            const listener = (_: Event) => {};
            ipc.on('tweetapp:online-status', listener);
            ipc.forget('tweetapp:online-status', listener);
            ok(ipcMain.removeListener.calledOnce);
            const call = ipcMain.removeListener.getCalls()[0];
            eq(call.args, ['tweetapp:online-status', listener]);
        });

        it('forgets all listeners on dispose()', function () {
            const l1 = (_: Event) => {};
            const l2 = (_: Event) => {};
            ipc.on('tweetapp:online-status', l1);
            ipc.on('tweetapp:online-status', l2);
            ipc.dispose();
            ok(ipcMain.removeListener.called);

            // Note: Map does not preserve order of elements.
            const actual = new Set(ipcMain.removeListener.getCalls().map((c: any) => c.args));
            const expected = new Set([
                ['tweetapp:online-status', l1],
                ['tweetapp:online-status', l2],
            ]);
            eq(actual, expected);
        });

        it('forgets nothing when listener was acutally not registered', function () {
            const l1 = (_: Event) => {};
            const l2 = (_: Event) => {};
            ipc.on('tweetapp:online-status', l1);
            ipc.forget('tweetapp:online-status', l2);
            ok(!ipcMain.removeListener.called);
        });
    });
});
