import * as querystring from 'querystring';
import * as assert from 'assert';
import * as path from 'path';
import { BrowserWindow, Menu, dialog, nativeImage, app } from 'electron';
import windowState = require('electron-window-state');
import log from './log';
import { ON_DARWIN, IS_DEBUG, PRELOAD_JS, ICON_PATH } from './constants';
import Ipc from './ipc';
import { touchBar } from './menu';
import { openConfig } from './config';

// XXX: TENTATIVE: detect back button by aria label
const INJECTED_CSS =
    'a[href="/"] { display: none !important; }\n' +
    'a[href="/home"] { display: none !important; }\n' +
    ['Back', '戻る'].map(aria => `[aria-label="${aria}"] { display: none !important; }`).join('\n');

export default class TweetWindow {
    public readonly screenName: string | undefined;
    public readonly wantToQuit: Promise<void>;
    public didClose: Promise<void>;
    public prevTweetId: string | null;
    private readonly partition: string | undefined;
    private win: BrowserWindow | null;
    private hashtags: string;
    private resolveWantToQuit: () => void;
    private actionAfterTweet: ConfigAfterTweet | undefined;
    private onlineStatus: OnlineStatus;

    public constructor(
        screenName: string | undefined,
        private readonly config: Config,
        private readonly ipc: Ipc,
        opts: CommandLineOptions,
        private readonly menu: Menu,
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
        this.onOnlineStatusChange = this.onOnlineStatusChange.bind(this);
        this.wantToQuit = new Promise<void>(resolve => {
            this.resolveWantToQuit = resolve;
        });
        this.didClose = Promise.resolve();
        this.onlineStatus = 'online'; // Assume network is available at start
    }

    public updateOptions(opts: CommandLineOptions) {
        this.hashtags = (opts.hashtags || []).join(',');
        this.actionAfterTweet = opts.afterTweet || this.config.after_tweet;
        if (this.actionAfterTweet !== undefined) {
            this.actionAfterTweet = this.actionAfterTweet.toLowerCase() as ConfigAfterTweet;
        }
    }

    public openNewTweet(text?: string): Promise<void> {
        return this.open(false, text);
    }

    public openReply(text?: string): Promise<void> {
        return this.open(true, text);
    }

    public close(): Promise<void> {
        if (this.win !== null) {
            log.debug('Will close window');
            this.win.close();
        } else {
            log.debug('Window was already closed');
        }
        return this.didClose;
    }

    public isOpen(): boolean {
        return this.win !== null;
    }

    public async openPreviousTweet() {
        log.info('Open previous tweet', this.screenName, this.prevTweetId);

        if (this.screenName === undefined) {
            return this.requireConfigWithDialog('open previous tweet page');
        } else if (this.prevTweetId === null) {
            return this.notifyReplyUnavailableUntilTweet('open previous tweet page');
        }

        if (this.win === null) {
            await this.openNewTweet();
        } else if (this.win.isMinimized()) {
            this.win.restore();
        }
        assert.ok(this.win !== null);

        const url = `https://mobile.twitter.com/${this.screenName}/status/${this.prevTweetId}`;
        return new Promise<void>(resolve => {
            this.ipc.send('tweetapp:open', url);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.win!.webContents.once('dom-ready', () => {
                log.debug('Opened previous tweet:', url);
                resolve();
            });
        });
    }

    private notifyReplyUnavailableUntilTweet(doSomething: string) {
        return new Promise<void>(resolve => {
            dialog.showMessageBox(
                {
                    type: 'info',
                    title: `Cannot ${doSomething}`,
                    message: `To ${doSomething}, at least one tweet must be posted before`,
                    detail: `Please choose "New Tweet" from menu and post a new tweet at first`,
                    icon: nativeImage.createFromPath(ICON_PATH),
                    buttons: ['OK'],
                },
                () => resolve(),
            );
        });
    }

    private requireConfigWithDialog(doSomething: string) {
        return new Promise<void>(resolve => {
            const buttons = ['Edit Config', 'OK'];
            dialog.showMessageBox(
                {
                    type: 'info',
                    title: 'Config is required',
                    message: `Configuration is required to ${doSomething}`,
                    detail:
                        "Please click 'Edit Config', enter your @screen_name at 'default_account' field, restart app",
                    icon: nativeImage.createFromPath(ICON_PATH),
                    buttons,
                },
                idx => {
                    const label = buttons[idx];
                    if (label === 'Edit Config') {
                        openConfig().then(resolve);
                    } else {
                        resolve();
                    }
                },
            );
        });
    }

    private composeNewTweetUrl(text?: string): string {
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

    private composeReplyUrl(text?: string): string {
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

    private composeTweetUrl(reply: boolean, text?: string): string {
        if (reply) {
            return this.composeReplyUrl(text);
        } else {
            return this.composeNewTweetUrl(text);
        }
    }

    private windowConfig<T extends number | boolean>(name: keyof WindowConfig, defaultVal: T): T {
        if (this.config.window === undefined) {
            return defaultVal;
        }
        if (this.config.window[name] === undefined) {
            return defaultVal;
        }
        return this.config.window[name] as T;
    }

    private async open(reply: boolean, text?: string) {
        if (reply) {
            if (this.screenName === undefined) {
                await this.requireConfigWithDialog('reply to previous tweet');
            } else if (this.prevTweetId === null) {
                await this.notifyReplyUnavailableUntilTweet('reply to previous tweet');
            }
        }

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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.win!.webContents.once('dom-ready', () => {
                    log.debug('Reopened content:', url);
                    resolve();
                });
            });
        }

        return new Promise<void>(resolve => {
            log.debug('Start application');

            const width = this.windowConfig('width', 600);
            const height = this.windowConfig('height', 600);
            const zoomFactor = this.windowConfig('zoom', 1.0);
            const autoHideMenuBar = this.windowConfig('auto_hide_menu_bar', true);
            const state = windowState({});

            const winOpts = {
                width,
                height,
                resizable: false,
                x: state.x,
                y: state.y,
                icon: ICON_PATH,
                show: false,
                title: 'Tweet',
                titleBarStyle: 'hiddenInset' as 'hiddenInset',
                frame: !ON_DARWIN,
                fullscreenable: false,
                useContentSize: true,
                autoHideMenuBar,
                webPreferences: {
                    nodeIntegration: false,
                    sandbox: true,
                    preload: PRELOAD_JS,
                    contextIsolation: true,
                    webviewTag: false,
                    partition: this.partition,
                    zoomFactor,
                },
            };
            log.debug('Create BrowserWindow with options:', winOpts);
            const win = new BrowserWindow(winOpts);
            state.manage(win);

            if (!ON_DARWIN) {
                win.setMenu(this.menu);
            }

            this.ipc.attach(win.webContents);

            win.once('ready-to-show', () => {
                log.debug('Event: ready-to-show');
                win.show();
            });

            win.once('close', _ => {
                log.debug('Event: close');
                assert.ok(this.win !== null);
                /* eslint-disable @typescript-eslint/no-non-null-assertion */
                this.ipc.detach(this.win!.webContents);
                this.ipc.forget('tweetapp:prev-tweet-id', this.onPrevTweetIdReceived);
                this.ipc.forget('tweetapp:online-status', this.onOnlineStatusChange);
                this.win!.webContents.removeAllListeners();
                this.win!.webContents.session.setPermissionRequestHandler(null);
                this.win!.webContents.session.webRequest.onBeforeRequest(null as any);
                this.win!.webContents.session.webRequest.onCompleted(null as any);
                /* eslint-enable @typescript-eslint/no-non-null-assertion */
            });

            win.on('page-title-updated', e => e.preventDefault());

            this.didClose = new Promise<void>(resolve => {
                win.once('closed', (_: Event) => {
                    log.debug('Event: closed');
                    assert.ok(this.win !== null);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.win!.removeAllListeners();
                    this.win = null;
                    if (ON_DARWIN) {
                        app.hide();
                    }
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
                let css = INJECTED_CSS;
                if (ON_DARWIN) {
                    // Allow to move window by dragging any part of the window. Exception is a tweet
                    // form since it prevents text selection
                    css += '\nbody {-webkit-app-region: drag;}\n.DraftEditor-root {-webkit-app-region: no-drag;}';
                }
                if (this.screenName !== undefined) {
                    css += `\na[href="/${this.screenName}"] { display: none !important; }`;
                }
                win.webContents.insertCSS(css);
            });

            win.webContents.on('dom-ready', () => {
                log.debug('Event: dom-ready');
                if (this.screenName !== undefined) {
                    this.ipc.send('tweetapp:screen-name', this.screenName);
                }
                this.ipc.send('tweetapp:action-after-tweet', this.actionAfterTweet);
            });

            win.webContents.once('dom-ready', () => {
                if (IS_DEBUG) {
                    win.webContents.openDevTools({ mode: 'detach' });
                }
                resolve();
            });

            win.webContents.session.webRequest.onCompleted(
                {
                    urls: [
                        'https://api.twitter.com/1.1/statuses/update.json',
                        'https://api.twitter.com/1.1/statuses/destroy.json',
                    ],
                },
                details => {
                    if (details.statusCode !== 200 || details.fromCache) {
                        return;
                    }

                    if (details.url.endsWith('/destroy.json')) {
                        const url = this.composeTweetUrl(false);
                        log.info('Destroyed tweet:', details.url, 'Next URL:', url);
                        this.prevTweetId = null; // Clear previous tweet ID since it would no longer exist
                        this.ipc.send('tweetapp:open', url);
                        return;
                    }

                    switch (this.actionAfterTweet) {
                        case 'close':
                            log.info("Will close window since action after tweet is 'close'");
                            this.close();
                            break;
                        case 'quit':
                            log.info("Will quit since action after tweet is 'quit'");
                            this.resolveWantToQuit();
                            break;
                        default: {
                            const url = this.composeTweetUrl(false);
                            log.info('Posted tweet:', details.url, 'Next URL:', url);
                            this.ipc.send('tweetapp:sent-tweet', url);
                            break;
                        }
                    }
                },
            );

            // TODO?: May be blocked for better performance?
            // - 'https://api.twitter.com/2/notifications/all.json?*',
            // - 'https://api.twitter.com/2/timeline/home.json?*',
            // - 'https://api.twitter.com/1.1/client_event.json',
            win.webContents.session.webRequest.onBeforeRequest(
                {
                    urls: ['https://www.google-analytics.com/r/*', 'https://api.twitter.com/1.1/statuses/update.json'],
                },
                (details: any, callback) => {
                    if (details.url === 'https://api.twitter.com/1.1/statuses/update.json') {
                        // Tweet was posted. It means that user has already logged in.
                        win.webContents.session.webRequest.onBeforeRequest(null as any);
                    } else if ((details as any).referrer === 'https://mobile.twitter.com/login') {
                        // XXX: TENTATIVE: detect login from google-analitics requests
                        log.debug('Login detected from URL', details.url);
                        this.ipc.send('tweetapp:login');
                        // Remove listener anymore
                        win.webContents.session.webRequest.onBeforeRequest(null as any);
                    }
                    callback({});
                },
            );

            win.webContents.session.setPermissionRequestHandler((webContents, perm, callback, details) => {
                const url = webContents.getURL();
                if (!url.startsWith('https://mobile.twitter.com/')) {
                    log.info('Blocked permission request', perm, 'from', url, 'Details:', details);
                    callback(false);
                    return;
                }

                const allowed = ['media', 'geolocation'];
                if (!allowed.includes(perm)) {
                    log.info(
                        'Blocked not allowed permission',
                        perm,
                        '. Allowed permissions are:',
                        allowed,
                        'Details:',
                        details,
                    );
                    callback(false);
                    return;
                }

                dialog.showMessageBox(
                    {
                        type: 'info',
                        title: 'Permission was requested',
                        message: `Permission '${perm}' was requested from ${url}`,
                        detail: "Please click 'Accept' to allow the request or 'Reject' to reject it",
                        icon: nativeImage.createFromPath(ICON_PATH),
                        buttons: ['Accept', 'Reject'],
                    },
                    idx => {
                        callback(idx === 0);
                    },
                );
            });

            this.ipc.on('tweetapp:prev-tweet-id', this.onPrevTweetIdReceived);
            this.ipc.on('tweetapp:online-status', this.onOnlineStatusChange);

            const url = this.composeTweetUrl(reply, text);
            log.info('Opening', url);
            win.loadURL(url);

            if (ON_DARWIN) {
                win.setTouchBar(
                    touchBar(
                        this.screenName,
                        this.open.bind(this, false),
                        this.open.bind(this, true),
                        this.openPreviousTweet.bind(this),
                    ),
                );
                log.debug('Touch bar was set');
            }

            log.info('Created window for', this.screenName);
            this.win = win;
        });
    }

    private onPrevTweetIdReceived(_: Event, id: string) {
        log.info('Previous tweet:', id);
        this.prevTweetId = id;
    }

    private onOnlineStatusChange(_: Event, status: OnlineStatus) {
        log.info('Online status changed:', status, 'Previous status:', this.onlineStatus);

        if (this.onlineStatus === status) {
            log.debug('Do nothing for online status change');
            return;
        }
        this.onlineStatus = status;

        if (this.win === null) {
            log.info('Do nothing on online status change since no window is shown');
            return;
        }

        if (status === 'online') {
            const url = this.composeTweetUrl(false);
            log.info('Reopen window since network is now online:', url);
            this.win.loadURL(url);
            return;
        }

        // When offline

        const html = `file://${path.join(__dirname, 'offline.html')}`;
        this.win.loadURL(html);
        log.debug('Open offline page:', html);
    }
}
