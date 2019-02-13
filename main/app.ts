import { Menu } from 'electron';
import TweetWindow from './window';
import Ipc from './ipc';
import log from './log';
import createMenu from './menu';

class Lifecycle {
    // Use Promise for representing quit() is called only once in lifecycle.
    public didQuit: Promise<void>;
    private win: TweetWindow;
    private ipc: Ipc;
    private resolveQuit: () => void;

    constructor(config: Config, private opts: CommandLineOptions) {
        this.quit = this.quit.bind(this);
        this.didQuit = new Promise(resolve => {
            this.resolveQuit = resolve;
        });
        this.ipc = new Ipc();

        const menu = createMenu(this.ipc, this.quit);
        Menu.setApplicationMenu(menu);

        this.win = new TweetWindow(config, this.ipc, opts, menu);
    }

    start(): Promise<void> {
        this.win.didClose = this.quit;
        return this.win.open(this.opts.text);
    }

    quit() {
        // this.win.close();
        this.ipc.dispose();
        this.resolveQuit();
    }
}

export default function runApp(config: Config, opts: CommandLineOptions): Promise<void> {
    log.info('App is starting');
    const lifecycle = new Lifecycle(config, opts);
    lifecycle.start().then(() => log.info('App has started'));
    return lifecycle.didQuit.then(() => log.info('App has quit'));
}
