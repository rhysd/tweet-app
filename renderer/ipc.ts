import { ipcRenderer } from 'electron';

export type Listener = (event: Event, ...args: any[]) => void;

const ipc = new (class {
    private listeners: [IpcChan.FromMain, Listener][];

    public constructor() {
        this.listeners = [];
    }

    public send(chan: IpcChan.FromRenderer, ...args: any[]) {
        ipcRenderer.send(chan, ...args);
    }

    public on(chan: IpcChan.FromMain, listener: Listener) {
        ipcRenderer.on(chan, listener);
        this.listeners.push([chan, listener]);
    }

    public dispose() {
        for (const [chan, listener] of this.listeners) {
            ipcRenderer.removeListener(chan, listener);
        }
        this.listeners = [];
    }
})();

export default ipc;
