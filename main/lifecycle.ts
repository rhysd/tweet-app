import { app, Menu, globalShortcut } from 'electron';
import TweetWindow from './window';
import Ipc from './ipc';
import log from './log';
import { createMenu, dockMenu } from './menu';
import { ON_DARWIN, ON_WINDOWS, ON_INTEG_TEST } from './constants';

export default class Lifecycle {
    // Use Promise for representing quit() is called only once in lifecycle.
    public readonly didQuit: Promise<void>;
    private readonly ipc: Ipc;
    private readonly accounts: string[];
    private readonly menu: Menu;
    private resolveQuit: () => void;
    private currentWin: TweetWindow;
    private switchingAccount: boolean;
    private prevTweetIds: Map<string, string | null>; // Screen name -> Maybe Tweet ID

    public constructor(private readonly config: Config, private opts: CommandLineOptions) {
        this.resolveQuit = () => {};
        this.didQuit = new Promise(resolve => {
            this.resolveQuit = resolve;
        });
        this.switchingAccount = false;
        this.ipc = new Ipc();
        this.prevTweetIds = new Map();

        this.accounts = [];
        if (config.default_account !== undefined) {
            this.accounts.push(config.default_account);
            if (config.other_accounts !== undefined) {
                Array.prototype.push.apply(this.accounts, config.other_accounts);
            }
        }
        log.debug('Accounts:', this.accounts);

        this.menu = createMenu(config.keymaps || {}, this.accounts, {
            quit: this.quit,
            tweet: this.newTweet,
            reply: this.replyToPrevTweet,
            tweetButton: this.clickTweetButton,
            accountSettings: this.openAccountSettings,
            switchAccount: this.switchAccount,
            openPrevTweet: this.openPreviousTweet,
            debug: this.openProfilePageForDebug,
        });
        this.currentWin = this.newWindow(config.default_account);
    }

    private newWindow(screenName?: string): TweetWindow {
        const win = new TweetWindow(screenName, this.config, this.ipc, this.opts, this.menu);
        const prevTweetId = win.screenName && this.prevTweetIds.get(win.screenName);
        if (prevTweetId !== undefined) {
            win.prevTweetId = prevTweetId;
        }
        win.wantToQuit.then(this.quit);
        return win;
    }

    public async runUntilQuit(): Promise<void> {
        Menu.setApplicationMenu(this.menu);

        if (this.config.hotkey) {
            globalShortcut.register(this.config.hotkey, this.toggleWindow);
        }

        if (ON_DARWIN) {
            app.dock.setMenu(dockMenu(this.newTweet, this.replyToPrevTweet));
        }

        if (ON_WINDOWS) {
            app.setUserTasks([
                {
                    program: process.execPath,
                    arguments: '',
                    iconPath: process.execPath,
                    iconIndex: 0,
                    title: 'New',
                    description: 'Create a new tweet',
                },
                {
                    program: process.execPath,
                    arguments: '--reply',
                    iconPath: process.execPath,
                    iconIndex: 0,
                    title: 'Reply',
                    description: 'Reply to a previous tweet',
                },
            ]);
        }

        // Constraint: Only one window should be open at the same time because IPC channel
        // from renderer process is broadcast.
        await this.currentWin.openNewTweet(this.opts.text);
        log.info('App has started');

        // Only on macOS, closing window does not mean finishing app.
        // Otherwise, quit on the main window is closing.
        //
        // Note:
        // On integration test, app should quit after window is closed even on macOS.
        // When BrowserWindow disables Node integration, there is no way to communicate with main
        // process by renderer process via WebDriver protocol anymore.
        // Though Spectron provides window.electronRequire interface, we cannot
        // expose require() to renderer context since we open Twitter website directly in
        // BrowserWindow.
        // In the case, What Spectron can do is only calling window.close(). It closes the window,
        // but it does not make app quit on macOS. To ensure to make app quit after integration test,
        // flag for integration test is necessary.
        if (this.config.quit_on_close || ON_INTEG_TEST) {
            // Ignore closing window while switching account
            do {
                await this.currentWin.didClose;
            } while (this.switchingAccount);
            await this.quit();
        }

        return this.didQuit;
    }

    public async restart(newOpts?: CommandLineOptions): Promise<void> {
        log.info('Reopen window content for options', newOpts);
        if (newOpts === undefined) {
            return this.currentWin.openNewTweet();
        }
        this.currentWin.updateOptions(newOpts);
        this.opts = newOpts;
        if (newOpts.reply) {
            return this.currentWin.openReply(newOpts.text);
        } else {
            return this.currentWin.openNewTweet(newOpts.text);
        }
    }

    // For context menu
    public unlinkSelection(text: string) {
        this.currentWin.unlinkSelection(text);
    }

    // Actions

    public clickTweetButton = () => {
        this.ipc.send('tweetapp:click-tweet-button');
    };

    public quit = async () => {
        log.debug('Will close window and quit');
        await this.currentWin.close();
        this.ipc.dispose();
        if (this.config.hotkey) {
            globalShortcut.unregisterAll();
        }
        this.resolveQuit();
    };

    public newTweet = () => {
        return this.currentWin.openNewTweet();
    };

    public replyToPrevTweet = () => {
        return this.currentWin.openReply();
    };

    public openProfilePageForDebug = () => {
        let url = 'https://mobile.twitter.com';
        if (this.currentWin.screenName !== undefined) {
            url = `https://mobile.twitter.com/${this.currentWin.screenName}`;
        }
        this.ipc.send('tweetapp:open', url);
    };

    public openAccountSettings = () => {
        this.ipc.send('tweetapp:open', 'https://mobile.twitter.com/settings/account');
    };

    public switchAccount = async (screenName: string) => {
        if (screenName.startsWith('@')) {
            screenName = screenName.slice(1);
        }
        if (this.currentWin.screenName === screenName) {
            log.debug('Skip switching account since given screen name is the same:', screenName);
            return;
        }
        this.switchingAccount = true;
        try {
            await this.currentWin.close();
            if (this.currentWin.screenName !== undefined) {
                this.prevTweetIds.set(this.currentWin.screenName, this.currentWin.prevTweetId);
            }
            this.currentWin = this.newWindow(screenName);
            await this.currentWin.openNewTweet();
        } finally {
            this.switchingAccount = false;
        }
    };

    public toggleWindow = () => {
        const opened = this.currentWin.isOpen();
        log.debug('Toggle window. Window is open:', opened);
        if (opened) {
            return this.currentWin.close();
        } else {
            return this.currentWin.openNewTweet();
        }
    };

    public openPreviousTweet = () => {
        return this.currentWin.openPreviousTweet();
    };
}
