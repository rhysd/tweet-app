import { app } from 'electron';
import contextMenu = require('electron-context-menu');
import { Lifecycle } from './app';
import log from './log';
import { loadConfig } from './config';
import { ON_DIRWIN, ICON_PATH } from './constants';

const locked = app.requestSingleInstanceLock();
if (!locked) {
    app.quit();
} else {
    go();
}

async function go() {
    // default_app sets app.on('all-window-closed', () => app.quit()) before
    // loading this application. We need to disable the callback.
    app.removeAllListeners();

    function parseCmdlineOptions(args: string[]): CommandLineOptions {
        const idx = args.indexOf('--') + 1;
        if (idx === 0 || idx >= args.length) {
            return { text: '' };
        }
        return JSON.parse(args[idx]);
    }

    contextMenu();

    let exitStatus = 0;

    try {
        const cmdOpts = parseCmdlineOptions(process.argv);
        const [config] = await Promise.all([loadConfig(), app.whenReady()]);

        if (ON_DIRWIN) {
            app.dock.setIcon(ICON_PATH);
        }

        log.info('App is starting with config', config, 'and cmdOpts', cmdOpts);
        const lifecycle = new Lifecycle(config, cmdOpts);

        app.on('second-instance', async (_: Event, cmdline: string[], _cwd: string) => {
            const newOpts = parseCmdlineOptions(cmdline);
            log.info('Second instance:', cmdline, newOpts);
            await lifecycle.restart(newOpts);
            log.info('Second instance started');
        });

        await lifecycle.runUntilQuit();
    } catch (err) {
        log.error('App quits due to error:', err.message);
        exitStatus = 1;
    } finally {
        app.quit();
        log.info('App quits with exit status', exitStatus);
        process.exit(exitStatus);
    }
}
