import * as assert from 'assert';
import { ipcMain } from 'electron';
import log from './log';

export type Listener = (event: Event, ...args: any[]) => void;

export default class Ipc {
    private sender: Electron.WebContents | null;
    // XXX: Using Map<T, U> does not work when the same listener is used for multiple channels.
    private readonly listeners: Map<Listener, IpcChan.FromRenderer>;

    public constructor() {
        this.sender = null;
        this.listeners = new Map<Listener, IpcChan.FromRenderer>();
    }

    public attach(sender: Electron.WebContents): void {
        log.debug('Attach webContents as IPC sender', sender.id);
        this.sender = sender;
    }

    public detach(sender: Electron.WebContents): void {
        if (this.sender !== sender) {
            return;
        }
        log.debug('Detach webContents as IPC sender', sender.id);
        this.sender = null;
    }

    public send(chan: IpcChan.FromMain, ...args: any[]): void {
        if (this.sender === null) {
            log.error('Cannot send IPC message because sender is not existing', chan, args);
        } else {
            log.debug('Send IPC message', chan, args, 'to sender', this.sender.id);
            this.sender.send(chan, ...args);
        }
    }

    public on(chan: IpcChan.FromRenderer, listener: Listener): void {
        assert.ok(!this.listeners.has(listener));
        ipcMain.on(chan, listener);
        this.listeners.set(listener, chan);
        log.debug('Listen IPC channel', chan, listener.name);
    }

    public forget(chan: IpcChan.FromRenderer, listener: Listener): void {
        const deleted = this.listeners.delete(listener);
        if (!deleted) {
            log.warn('No listener found for', chan, 'channel to forget');
            return;
        }
        ipcMain.removeListener(chan, listener);
        log.debug('Forget IPC channel', chan, listener.name);
    }

    public dispose(): void {
        for (const [listener, chan] of this.listeners.entries()) {
            ipcMain.removeListener(chan, listener);
        }
        this.listeners.clear();
        log.debug('remove all IPC channel listeners');
    }
}
