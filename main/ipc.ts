import { ipcMain } from 'electron';
import log from './log';

export type Listener = (event: Event, ...args: any[]) => void;

export default class Ipc {
    private sender: Electron.WebContents | null;
    private readonly listeners: Map<Listener, IPC.Chan>;

    constructor() {
        this.sender = null;
        this.listeners = new Map<Listener, IPC.Chan>();
    }

    attach(sender: Electron.WebContents) {
        log.debug('Attach webContents as IPC sender', sender.id);
        this.sender = sender;
    }

    detach(sender: Electron.WebContents) {
        if (this.sender !== sender) {
            return;
        }
        log.debug('Detach webContents as IPC sender', sender.id);
        this.sender = null;
    }

    send(chan: IPC.Chan, ...args: any[]) {
        if (this.sender === null) {
            log.error('Cannot send IPC message because sender is not existing', chan, args);
        } else {
            log.debug('Send IPC message', chan, args, 'to sender', this.sender.id);
            this.sender.send(chan, ...args);
        }
    }

    on(chan: IPC.Chan, listener: Listener) {
        ipcMain.on(chan, listener);
        this.listeners.set(listener, chan);
    }

    forget(chan: IPC.Chan, listener: Listener) {
        const deleted = this.listeners.delete(listener);
        if (!deleted) {
            log.warn('No listener found for', chan, 'channel to forget');
            return;
        }
        ipcMain.removeListener(chan, listener);
    }

    dispose() {
        for (const [listener, chan] of this.listeners.entries()) {
            ipcMain.removeListener(chan, listener);
        }
        this.listeners.clear();
    }
}
