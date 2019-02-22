import { app, Menu } from 'electron';
import TweetWindow from './window';
import Ipc from './ipc';
import log from './log';
import { createMenu, dockMenu } from './menu';
import { ON_DARWIN, ON_WINDOWS } from './constants';

export default class Lifecycle {
    // Use Promise for representing quit() is called only once in lifecycle.
    public readonly didQuit: Promise<void>;
    private readonly ipc: Ipc;
    private readonly accounts: string[];
    private readonly menu: Menu;
    private resolveQuit: () => void;
    private currentWin: TweetWindow;
    private switchingAccount: boolean;

    constructor(private readonly config: Config, private opts: CommandLineOptions) {
        this.didQuit = new Promise(resolve => {
            this.resolveQuit = resolve;
        });
        this.switchingAccount = false;
        this.ipc = new Ipc();

        this.accounts = [];
        if (config.default_account !== undefined) {
            this.accounts.push(config.default_account);
            if (config.other_accounts !== undefined) {
                Array.prototype.push.apply(this.accounts, config.other_accounts);
            }
        }
        log.debug('Accounts:', this.accounts);

        this.menu = createMenu(
            config.keymaps || {},
            this.accounts,
            this.quit,
            this.newTweet,
            this.replyToPrevTweet,
            this.clickTweetButton,
            this.openAccountSettings,
            this.switchAccount,
            this.openProfilePageForDebug,
        );
        this.currentWin = this.newWindow(config.default_account);
    }

    private newWindow(screenName?: string): TweetWindow {
        const win = new TweetWindow(screenName, this.config, this.ipc, this.opts, this.menu);
        win.wantToQuit.then(this.quit);
        return win;
    }

    async runUntilQuit(): Promise<void> {
        Menu.setApplicationMenu(this.menu);

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
        if (!ON_DARWIN) {
            // Ignore closing window while switching account
            do {
                await this.currentWin.didClose;
            } while (this.switchingAccount);
            await this.quit();
        }

        return this.didQuit;
    }

    async restart(newOpts?: CommandLineOptions): Promise<void> {
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

    // Actions

    clickTweetButton = () => {
        this.ipc.send('tweetapp:click-tweet-button');
    };

    quit = async () => {
        log.debug('Will close window and quit');
        await this.currentWin.close();
        this.ipc.dispose();
        this.resolveQuit();
    };

    newTweet = () => {
        this.currentWin.openNewTweet();
    };

    replyToPrevTweet = () => {
        this.currentWin.openReply();
    };

    openProfilePageForDebug = () => {
        let url = 'https://mobile.twitter.com';
        if (this.currentWin.screenName !== undefined) {
            url = `https://mobile.twitter.com/${this.currentWin.screenName}`;
        }
        this.ipc.send('tweetapp:open', url);
    };

    openAccountSettings = () => {
        this.ipc.send('tweetapp:open', 'https://mobile.twitter.com/settings/account');
    };

    switchAccount = async (screenName: string) => {
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
            this.currentWin = this.newWindow(screenName);
            await this.currentWin.openNewTweet();
        } finally {
            this.switchingAccount = false;
        }
    };
}
