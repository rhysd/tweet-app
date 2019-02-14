import * as querystring from 'querystring';
import * as assert from 'assert';
import { BrowserWindow, Menu } from 'electron';
import windowState = require('electron-window-state');
import log from './log';
import { ON_DIRWIN, IS_DEBUG, PRELOAD_JS } from './constants';
import Ipc from './ipc';

const CSS_REMOVE_BACK = ['Back', '戻る'].map(aria => `[aria-label="${aria}"] { display: none !important; }`).join('\n');

export default class TweetWindow {
    public didClose: (() => void) | null;
    public readonly screenName: string | undefined;
    public prevTweetId: string | null;
    private win: BrowserWindow | null;
    private hashtags: string;
    private partition: string | undefined;

    constructor(
        screenName: string | undefined,
        private config: Config,
        private ipc: Ipc,
        opts: CommandLineOptions,
        private menu: Menu,
    ) {
        this.hashtags = (opts.hashtags || []).join(',');
        if (screenName !== undefined) {
            this.screenName = screenName;
            if (this.screenName.startsWith('@')) {
                this.screenName = this.screenName.slice(1);
            }
            this.partition = `persist:tweet:${this.screenName}`;
        }
        this.win = null;
        this.prevTweetId = null;
        this.onPrevTweetIdReceived = this.onPrevTweetIdReceived.bind(this);
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

    composeReplyUrl(text?: string): string {
        let url = this.composeTweetUrl(text);
        if (this.prevTweetId === null) {
            log.warn(
                'Fall back to new tweet form since previous tweet is not found. You need to tweet at least once before this item',
            );
            return url;
        }
        if (url.includes('?')) {
            url += '&in_reply_to' + this.prevTweetId;
        } else {
            url += '?in_reply_to' + this.prevTweetId;
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
                    partition: this.partition,
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

            win.once('close', (_: Event) => {
                log.debug('Event: close');
                assert.ok(this.win !== null);
                this.ipc.detach(this.win!.webContents);
                this.ipc.forget('tweetapp:prev-tweet-id', this.onPrevTweetIdReceived);
                this.win!.webContents.removeAllListeners();
            });

            win.once('closed', (_: Event) => {
                log.debug('Event: closed');
                assert.ok(this.win !== null);
                this.win!.removeAllListeners();
                this.win = null;
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
                win.webContents.insertCSS(CSS_REMOVE_BACK);
            });

            win.webContents.on('dom-ready', () => {
                log.debug('Event: dom-ready');
                if (this.screenName !== undefined) {
                    this.ipc.send('tweetapp:screen-name', this.screenName);
                }
                this.ipc.send('tweetapp:config', this.config);
            });

            win.webContents.once('dom-ready', () => {
                const req = win.webContents.session.webRequest;
                const filter = {
                    urls: ['https://api.twitter.com/1.1/statuses/update.json'],
                };

                req.onCompleted(filter, (details: Electron.OnCompletedDetails) => {
                    if (details.statusCode !== 200 || details.method !== 'POST' || details.fromCache) {
                        return;
                    }
                    const tweetUrl = this.composeTweetUrl();
                    log.info('Posted tweet:', details.url, 'Next URL:', tweetUrl);

                    this.ipc.send('tweetapp:sent-tweet', tweetUrl);
                });
                if (IS_DEBUG) {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
                resolve();
            });

            this.ipc.on('tweetapp:prev-tweet-id', this.onPrevTweetIdReceived);

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

    private onPrevTweetIdReceived(_: Event, id: string) {
        log.info('Previous tweet:', id);
        this.prevTweetId = id;
    }
}
