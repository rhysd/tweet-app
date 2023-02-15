import { deepStrictEqual as eq, ok } from 'assert';
import sinon = require('sinon');
import Ipc from '../renderer/ipc';
import { reset } from './mock';

const { ipcRenderer } = require('electron') as any; // mocked

describe('Ipc on renderer', function () {
    beforeEach(reset);

    afterEach(function () {
        Ipc.dispose();
    });

    it('sends IPC message with send() method', function () {
        const args = ['tweetapp:prev-tweet-id', '12345'] as const;
        Ipc.send(...args);
        ok(ipcRenderer.send.calledOnce);
        eq(ipcRenderer.send.lastCall.args, args);
    });

    it('receives IP message by setting callback', function () {
        const callback = sinon.fake();
        Ipc.on('tweetapp:open', callback);
        ok(ipcRenderer.on.calledOnce);
        eq(ipcRenderer.on.lastCall.args[0], 'tweetapp:open');
        ipcRenderer.on.lastCall.args[1]();
        ok(callback.calledOnce);
    });

    it('removes all listeners on dispose() method', function () {
        const listeners = [
            ['tweetapp:open', (_: Event) => {}] as const,
            ['tweetapp:open', (_: Event) => {}] as const,
            ['tweetapp:action-after-tweet', (_: Event) => {}] as const,
        ];

        for (const [c, l] of listeners) {
            Ipc.on(c, l);
        }

        Ipc.dispose();

        eq(ipcRenderer.removeListener.callCount, 3);
        const calls = ipcRenderer.removeListener.getCalls();
        for (const [ch, l] of listeners) {
            const found = calls.find((c: any) => c.args[0] === ch && c.args[1] === l);
            ok(found);
        }
    });
});
