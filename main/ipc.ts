import { ipcMain } from 'electron';
import log from './log';

export type Listener = (event: Event, ...args: any[]) => void;

export default class Ipc {
    private sender: Electron.WebContents | null;
    private listeners: [IPC.Chan, Listener][];

    constructor() {
        this.sender = null;
        this.listeners = [];
    }

    attach(sender: Electron.WebContents) {
        log.debug('Attach webContents as IPC sender');
        this.sender = sender;
    }

    send(chan: IPC.Chan, ...args: any[]) {
        if (this.sender === null) {
            log.error('Cannot send IPC message because sender is not existing', chan, args);
        } else {
            log.debug('Send IPC message', chan, args);
            this.sender.send(chan, ...args);
        }
    }

    on(chan: IPC.Chan, listener: Listener) {
        ipcMain.on(chan, listener);
        this.listeners.push([chan, listener]);
    }

    dispose() {
        for (const [chan, listener] of this.listeners) {
            ipcMain.removeListener(chan, listener);
        }
        this.listeners = [];
    }
}
