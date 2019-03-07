import * as path from 'path';
import { EventEmitter } from 'events';
import sinon = require('sinon');
import mock = require('mock-require');
import merge = require('lodash.merge');

export const appDir = path.join(__dirname, 'appDir');

const electron: any = {};

function ctorSpy(statics?: { [n: string]: Function }) {
    class Spy {
        public args: any[];
        public constructor(...args: any[]) {
            this.args = args;
        }
    }

    if (statics !== undefined) {
        for (const s of Object.keys(statics)) {
            Object.defineProperty(Spy, s, { value: statics[s] });
        }
    }

    return Spy;
}

class DummyWebContents extends EventEmitter {
    public session = {
        webRequest: {
            onBeforeRequest: sinon.fake(),
            onCompleted: sinon.fake(),
        },
        setPermissionRequestHandler: sinon.fake(),
    };
    public openDevTools = sinon.fake();
    public send = sinon.fake();
    public url: string | undefined;

    public constructor() {
        super();
    }

    public getURL() {
        return this.url;
    }
}

class DummyBrowserWindow extends EventEmitter {
    public restore = sinon.fake();
    public focus = sinon.fake();
    public show = sinon.fake();
    public setMenu = sinon.fake();
    public setTouchBar = sinon.fake();
    public isMinimized = sinon.fake.returns(false);
    public setVisibleOnAllWorkspaces = sinon.fake();
    public webContents: DummyWebContents;

    public constructor(public opts: any) {
        super();
        this.webContents = new DummyWebContents();
    }

    public loadURL(url: string) {
        this.emit('ready-to-show');
        this.webContents.url = url;
        process.nextTick(() => this.webContents.emit('dom-ready'));
    }

    public close() {
        this.emit('close');
        this.emit('closed');
        this.webContents.url = undefined;
    }
}

export function reset() {
    merge(electron, {
        app: {
            getPath: sinon.fake.returns(appDir),
            dock: {
                setMenu: sinon.fake(),
            },
            setUserTasks: sinon.fake(),
            hide: sinon.fake(),
        },
        shell: {
            openItem: sinon.fake(),
            openExternal: sinon.fake(),
        },
        ipcMain: {
            on: sinon.fake(),
            removeListener: sinon.fake(),
        },
        Menu: {
            buildFromTemplate: sinon.stub().returnsArg(0),
            setApplicationMenu: sinon.fake(),
        },
        TouchBar: ctorSpy({
            TouchBarLabel: ctorSpy(),
            TouchBarButton: ctorSpy(),
            TouchBarSpacer: ctorSpy(),
        }),
        BrowserWindow: DummyBrowserWindow,
        dialog: {
            showMessageBox: sinon.fake(),
        },
        nativeImage: {
            createFromPath: sinon.fake(),
        },
        ipcRenderer: {
            send: sinon.fake(),
            on: sinon.fake(),
            removeListener: sinon.fake(),
            removeAllListeners: sinon.fake(),
        },
        globalShortcut: {
            register: sinon.fake(),
            unregisterAll: sinon.fake(),
        },
    });
}
reset();

mock('electron', electron);
mock('electron-window-state', () => ({
    x: 600,
    y: 600,
    manage() {},
}));
