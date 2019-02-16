import * as querystring from 'querystring';
import * as assert from 'assert';
import { BrowserWindow, Menu } from 'electron';
import windowState = require('electron-window-state');
import log from './log';
import { ON_DARWIN, IS_DEBUG, PRELOAD_JS, ICON_PATH } from './constants';
import Ipc from './ipc';

const CSS_REMOVE_BACK =
    'body {-webkit-app-region: drag;}' +
    ['Back', '戻る'].map(aria => `[aria-label="${aria}"] { display: none !important; }`).join('\n');

export default class TweetWindow {
    public didClose: Promise<void>;
    public readonly screenName: string | undefined;
    public prevTweetId: string | null;
    public wantToQuit: Promise<void>;
    private win: BrowserWindow | null;
    private hashtags: string;
    private partition: string | undefined;
    private resolveWantToQuit: () => void;
    private actionAfterTweet: ConfigAfterTweet | undefined;

    constructor(
        screenName: string | undefined,
        private config: Config,
        private ipc: Ipc,
        opts: CommandLineOptions,
        private menu: Menu,
    ) {
        this.updateOptions(opts);

        if (screenName !== undefined && screenName !== '') {
            this.screenName = screenName;
            if (this.screenName.startsWith('@')) {
                this.screenName = this.screenName.slice(1);
            }
            this.partition = `persist:tweet:${this.screenName}`;
        }

        this.win = null;
        this.prevTweetId = null;
        this.onPrevTweetIdReceived = this.onPrevTweetIdReceived.bind(this);
        this.wantToQuit = new Promise<void>(resolve => {
            this.resolveWantToQuit = resolve;
        });
        this.didClose = Promise.resolve();
    }

    updateOptions(opts: CommandLineOptions) {
        this.hashtags = (opts.hashtags || []).join(',');
        this.actionAfterTweet = opts.afterTweet || this.config.after_tweet;
        if (this.actionAfterTweet !== undefined) {
            this.actionAfterTweet = this.actionAfterTweet.toLowerCase() as ConfigAfterTweet;
        }
    }

    composeNewTweetUrl(text?: string): string {
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
        let url = this.composeNewTweetUrl(text);
        if (this.prevTweetId === null) {
            log.warn(
                'Fall back to new tweet form since previous tweet is not found. You need to tweet at least once before this item',
            );
            return url;
        }
        if (url.includes('?')) {
            url += '&in_reply_to=' + this.prevTweetId;
        } else {
            url += '?in_reply_to=' + this.prevTweetId;
        }
        return url;
    }

    composeTweetUrl(reply?: boolean, text?: string): string {
        if (reply) {
            return this.composeReplyUrl(text);
        } else {
            return this.composeNewTweetUrl(text);
        }
    }

    open(reply?: boolean, text?: string) {
        if (this.win !== null) {
            if (this.win.isMinimized()) {
                this.win.restore();
            }
            this.win.focus();
            const url = this.composeTweetUrl(reply, text);

            if (this.win.webContents.getURL() === url) {
                log.info('Skip reopening content since URL is the same:', url);
                return Promise.resolve();
            }

            log.info('Window is already open. Will reopen content:', url);

            return new Promise<void>(resolve => {
                this.ipc.send('tweetapp:open', url);
                this.win!.webContents.once('dom-ready', () => {
                    log.debug('Reopened content:', url);
                    resolve();
                });
            });
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
                icon: ICON_PATH,
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

            if (!ON_DARWIN) {
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

            this.didClose = new Promise<void>(resolve => {
                win.once('closed', (_: Event) => {
                    log.debug('Event: closed');
                    assert.ok(this.win !== null);
                    this.win!.removeAllListeners();
                    this.win = null;
                    resolve();
                });
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
                this.ipc.send('tweetapp:action-after-tweet', this.actionAfterTweet);
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

                    switch (this.actionAfterTweet) {
                        case 'close':
                            this.close();
                            break;
                        case 'quit':
                            this.resolveWantToQuit();
                            break;
                        default:
                            this.ipc.send('tweetapp:sent-tweet', tweetUrl);
                            break;
                    }
                });
                if (IS_DEBUG) {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
                resolve();
            });

            this.ipc.on('tweetapp:prev-tweet-id', this.onPrevTweetIdReceived);

            const url = this.composeTweetUrl(reply, text);
            log.info('Opening', url);
            win.loadURL(url);
            win.focus();

            this.win = win;
        });
    }

    close(): Promise<void> {
        if (this.win !== null) {
            log.debug('Will close window');
            this.win.close();
        } else {
            log.debug('Window was already closed');
        }
        return this.didClose;
    }

    private onPrevTweetIdReceived(_: Event, id: string) {
        log.info('Previous tweet:', id);
        this.prevTweetId = id;
    }
}
