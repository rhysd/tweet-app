import { ipcMain } from 'electron';

export type Listener = (event: Event, ...args: any[]) => void;

export default class Ipc {
    private listeners: [IPC.Chan, Listener][];

    constructor(private sender: Electron.WebContents) {
        this.listeners = [];
    }

    send(chan: IPC.Chan, ...args: any[]) {
        this.sender.send(chan, ...args);
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
