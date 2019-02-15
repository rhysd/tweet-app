import { Menu } from 'electron';
import TweetWindow from './window';
import Ipc from './ipc';
import log from './log';
import createMenu from './menu';
import { ON_DIRWIN } from './constants';

export class Lifecycle {
    // Use Promise for representing quit() is called only once in lifecycle.
    public didQuit: Promise<void>;
    private currentWin: TweetWindow;
    private ipc: Ipc;
    private resolveQuit: () => void;

    constructor(config: Config, private opts: CommandLineOptions) {
        this.didQuit = new Promise(resolve => {
            this.resolveQuit = resolve;
        });
        this.ipc = new Ipc();

        const menu = createMenu(
            config.keymaps || {},
            this.quit,
            this.newTweet,
            this.replyToPrevTweet,
            this.clickTweetButton,
            this.openProfilePageForDebug,
        );
        Menu.setApplicationMenu(menu);

        const win = new TweetWindow(config.default_account, config, this.ipc, opts, menu);
        win.wantToQuit.then(this.quit);
        this.currentWin = win;
    }

    async runUntilQuit(): Promise<void> {
        // Constraint: Only one window should be open at the same time because IPC channel
        // from renderer process is broadcast.
        await this.currentWin.open(false, this.opts.text);
        log.info('App has started');

        // Only on macOS, closing window does not mean finishing app.
        // Otherwise, quit on the main window is closing.
        // This process would be not correct when multiple accounts are supported since switching
        // among accounts would require to close window
        if (!ON_DIRWIN) {
            await this.currentWin.didClose;
            await this.quit();
        }

        return this.didQuit;
    }

    async restart(newOpts?: CommandLineOptions): Promise<void> {
        log.info('Reopen window content for options', newOpts);
        if (newOpts === undefined) {
            return this.currentWin.open();
        }
        this.currentWin.updateOptions(newOpts);
        this.opts = newOpts;
        return this.currentWin.open(!!newOpts.reply, newOpts.text);
    }

    // Actions

    clickTweetButton = () => {
        this.ipc.send('tweetapp:click-tweet-button');
    };

    quit = async () => {
        await this.currentWin.close();
        this.ipc.dispose();
        this.resolveQuit();
    };

    newTweet = () => {
        this.currentWin.open(false);
    };

    replyToPrevTweet = () => {
        this.currentWin.open(true);
    };

    openProfilePageForDebug = () => {
        let url = 'https://mobile.twitter.com';
        if (this.currentWin.screenName !== undefined) {
            url = `https://mobile.twitter.com/${this.currentWin.screenName}`;
        }
        this.ipc.send('tweetapp:open', url);
    };
}
