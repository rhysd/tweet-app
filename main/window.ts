import { BrowserWindow } from 'electron';
import windowState = require('electron-window-state');
import log from './log';
import { IS_DEBUG, PRELOAD_JS } from './constants';
import Ipc from './ipc';

export default class TweetWindow {
    public didCloseWindow?: () => void;
    private win: BrowserWindow | null;
    private ipc: Ipc | null;

    constructor(private config: Config) {
        this.win = null;
        this.ipc = null;
    }

    open() {
        return new Promise<void>(resolve => {
            log.debug('Start application');

            const state = windowState({});
            const win = new BrowserWindow({
                width: 600,
                height: 600,
                resizable: false,
                x: state.x,
                y: state.y,
                // TODO: icon: ...
                show: false,
                titleBarStyle: 'hidden',
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    sandbox: true,
                    preload: PRELOAD_JS,
                    contextIsolation: true,
                    // TODO: partition: ... for multiple accounts
                },
            });
            state.manage(win);

            const ipc = new Ipc(win.webContents);

            win.once('ready-to-show', () => {
                win.show();
            });
            win.once('closed', () => {
                log.debug('Event: closed');
                if (this.ipc !== null) {
                    this.ipc.dispose();
                    this.ipc = null;
                }
                if (this.win !== null) {
                    this.win.webContents.removeAllListeners();
                    this.win.removeAllListeners();
                    this.win = null;
                }
                if (this.didCloseWindow) {
                    this.didCloseWindow();
                }
            });

            win.webContents.on('will-navigate', (e, url) => {
                log.info('Event: will-navigate:', url);

                // Do not allow to go outside Twitter site
                if (url.startsWith('https://mobile.twitter.com/')) {
                    return;
                }

                e.preventDefault();
                log.warn('Blocked navigation:', url);
            });
            win.webContents.on('new-window', (e, url) => {
                log.info('Event: new-window:', url);
                e.preventDefault();
                log.warn('Blocked navigation:', url);
            });

            win.webContents.on('did-finish-load', () => {
                log.debug('Event: did-finish-load');
                win.webContents.insertCSS('[aria-label="Back"] { display: none !important; }');
            });
            win.webContents.once('dom-ready', () => {
                log.debug('Event: dom-ready');
                ipc.send('tweetapp:config', this.config);
                if (IS_DEBUG) {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
                resolve();
            });

            const url = 'https://mobile.twitter.com/compose/tweet';
            log.info('Opening', url);
            win.loadURL(url);

            this.win = win;
            this.ipc = ipc;
        });
    }

    close() {
        if (this.win !== null) {
            this.win.close();
        }
    }
}
