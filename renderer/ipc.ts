import { ipcRenderer } from 'electron';
import type { IpcFromMain, IpcFromRenderer } from '../types/common';

export type Listener = (event: Event, ...args: unknown[]) => void;

const ipc = new (class {
    private listeners: [IpcFromMain, Listener][];

    public constructor() {
        this.listeners = [];
    }

    public send(chan: IpcFromRenderer, ...args: unknown[]): void {
        ipcRenderer.send(chan, ...args);
    }

    public on(chan: IpcFromMain, listener: Listener): void {
        ipcRenderer.on(chan, listener);
        this.listeners.push([chan, listener]);
    }

    public dispose(): void {
        for (const [chan, listener] of this.listeners) {
            ipcRenderer.removeListener(chan, listener);
        }
        this.listeners = [];
    }
})();

export default ipc;
