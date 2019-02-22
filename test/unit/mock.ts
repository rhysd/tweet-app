import * as path from 'path';
import { EventEmitter } from 'events';
import sinon = require('sinon');
import mock = require('mock-require');
import merge = require('lodash.merge');

export const appDir = path.join(__dirname, 'appDir');

const electron: any = {};

function ctorSpy(statics?: { [n: string]: Function }) {
    const klass = class {
        args: any[];
        constructor(...args: any[]) {
            this.args = args;
        }
    };
    if (statics !== undefined) {
        for (const s of Object.keys(statics)) {
            Object.defineProperty(klass, s, { value: statics[s] });
        }
    }
    return klass;
}

class DummyWebContents extends EventEmitter {
    session = {
        webRequest: {
            onBeforeRequest: sinon.fake(),
            onCompleted: sinon.fake(),
        },
    };
    openDevTools = sinon.fake();
    send = sinon.fake();
    url: string | undefined;

    constructor() {
        super();
    }

    getURL() {
        return this.url;
    }
}

class DummyBrowserWindow extends EventEmitter {
    restore = sinon.fake();
    focus = sinon.fake();
    show = sinon.fake();
    setMenu = sinon.fake();
    setTouchBar = sinon.fake();
    isMinimized = sinon.fake.returns(false);
    webContents: DummyWebContents;

    constructor(public opts: any) {
        super();
        this.webContents = new DummyWebContents();
    }

    loadURL(url: string) {
        this.emit('ready-to-show');
        this.webContents.url = url;
        process.nextTick(() => this.webContents.emit('dom-ready'));
    }

    close() {
        this.emit('close');
        this.emit('closed');
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
        },
        shell: {
            openItem: sinon.fake(),
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
    });
}
reset();

mock('electron', electron);
mock('electron-window-state', () => ({
    x: 600,
    y: 600,
    manage() {},
}));
