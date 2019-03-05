import { ipcRenderer } from 'electron';

export type Listener = (event: Event, ...args: any[]) => void;

const ipc = new class {
    private listeners: [IPC.Chan, Listener][];

    public constructor() {
        this.listeners = [];
    }

    public send(chan: IPC.Chan, ...args: any[]) {
        ipcRenderer.send(chan, ...args);
    }

    public on(chan: IPC.Chan, listener: Listener) {
        ipcRenderer.on(chan, listener);
        this.listeners.push([chan, listener]);
    }

    public dispose() {
        for (const [chan, listener] of this.listeners) {
            ipcRenderer.removeListener(chan, listener);
        }
        this.listeners = [];
    }
}();

export default ipc;
