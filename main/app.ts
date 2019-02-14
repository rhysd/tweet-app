import { Menu } from 'electron';
import TweetWindow from './window';
import Ipc from './ipc';
import log from './log';
import createMenu from './menu';

class Lifecycle {
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
            this.quit,
            this.newTweet,
            this.replyToPrevTweet,
            this.clickTweetButton,
            this.openProfilePageForDebug,
        );
        Menu.setApplicationMenu(menu);

        this.currentWin = new TweetWindow(config.default_account, config, this.ipc, opts, menu);
    }

    start(): Promise<void> {
        this.currentWin.didClose = this.quit;

        // Constraint: Only one window should be open at the same time because IPC channel
        // from renderer process is broadcast.
        return this.currentWin.open(this.opts.text);
    }

    clickTweetButton = () => {
        this.ipc.send('tweetapp:click-tweet-button');
    };

    quit = () => {
        this.currentWin.close();
        this.ipc.dispose();
        this.resolveQuit();
    };

    newTweet = () => {
        this.ipc.send('tweetapp:open', this.currentWin.composeTweetUrl());
    };

    replyToPrevTweet = () => {
        this.ipc.send('tweetapp:open', this.currentWin.composeReplyUrl());
    };

    openProfilePageForDebug = () => {
        let url = 'https://mobile.twitter.com';
        if (this.currentWin.screenName !== undefined) {
            url = `https://mobile.twitter.com/${this.currentWin.screenName}`;
        }
        this.ipc.send('tweetapp:open', url);
    };
}

export default function runApp(config: Config, opts: CommandLineOptions): Promise<void> {
    log.info('App is starting');
    const lifecycle = new Lifecycle(config, opts);
    lifecycle.start().then(() => log.info('App has started'));
    return lifecycle.didQuit.then(() => log.info('App has quit'));
}
