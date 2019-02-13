import * as querystring from 'querystring';
import { BrowserWindow, session, Menu } from 'electron';
import windowState = require('electron-window-state');
import log from './log';
import { ON_DIRWIN, IS_DEBUG, PRELOAD_JS } from './constants';
import Ipc from './ipc';

export default class TweetWindow {
    public didClose: (() => void) | null;
    private win: BrowserWindow | null;
    private hashtags: string;

    constructor(private config: Config, private ipc: Ipc, opts: CommandLineOptions, private menu: Menu) {
        this.hashtags = (opts.hashtags || []).join(',');
        this.win = null;
    }

    composeTweetUrl(text?: string): string {
        let queries = [];
        if (text !== undefined && text !== '') {
            queries.push('text=' + querystring.escape(text));
        }
        if (this.hashtags.length > 0) {
            queries.push('hashtags=' + querystring.escape(this.hashtags));
        }

        let url = 'https://mobile.twitter.com/compose/tweet';
        if (queries.length > 0) {
            url += '?' + queries.join('&');
        }
        return url;
    }

    open(text?: string) {
        if (this.win !== null) {
            // TODO: Should we refresh content?
            this.win.show();
            return Promise.resolve();
        }
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
                titleBarStyle: 'hiddenInset',
                frame: false,
                fullscreenable: false,
                useContentSize: true,
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    sandbox: true,
                    preload: PRELOAD_JS,
                    contextIsolation: true,
                    webviewTag: false,
                    // TODO: partition: ... for multiple accounts
                },
            });
            state.manage(win);

            if (!ON_DIRWIN) {
                win.setMenu(this.menu);
            }

            this.ipc.attach(win.webContents);

            win.once('ready-to-show', () => {
                win.show();
            });
            win.once('closed', () => {
                log.debug('Event: closed');
                if (this.win !== null) {
                    this.win.removeAllListeners();
                    this.win = null;
                }
                if (this.didClose) {
                    this.didClose();
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
                log.warn('Blocked gew window creation:', url);
            });

            win.webContents.on('did-finish-load', () => {
                log.debug('Event: did-finish-load');
                win.webContents.insertCSS('[aria-label="Back"] { display: none !important; }');
            });
            win.webContents.on('dom-ready', () => {
                log.debug('Event: dom-ready');
                this.ipc.send('tweetapp:config', this.config);
            });
            win.webContents.once('dom-ready', () => {
                const ses = session.defaultSession;
                if (ses !== undefined) {
                    // 'https://api.twitter.com/1.1/statuses/update.json'
                    const req = ses.webRequest;
                    const filter = {
                        urls: ['https://api.twitter.com/1.1/statuses/update.json'],
                    };
                    req.onCompleted(filter, (details: Electron.OnCompletedDetails) => {
                        if (details.statusCode !== 200 || details.method !== 'POST' || details.fromCache) {
                            return;
                        }
                        const tweetUrl = this.composeTweetUrl();
                        log.debug('Posted tweet:', details.url, 'next URL:', tweetUrl);
                        this.ipc.send('tweetapp:sent-tweet', tweetUrl);
                    });
                } else {
                    log.error('Could not get default session');
                }
                if (IS_DEBUG) {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
                resolve();
            });

            const url = this.composeTweetUrl(text);
            log.info('Opening', url);
            win.loadURL(url);
            win.focus();

            this.win = win;
        });
    }

    close() {
        if (this.win !== null) {
            this.win.close();
        }
    }
}
