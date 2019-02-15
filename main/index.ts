import { app } from 'electron';
import contextMenu = require('electron-context-menu');
import { Lifecycle } from './app';
import log from './log';
import { loadConfig } from './config';

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

    try {
        const cmdOpts = parseCmdlineOptions(process.argv);
        const [config] = await Promise.all([loadConfig(), app.whenReady()]);

        log.info('App is starting with config', config, 'and cmdOpts', cmdOpts);
        const lifecycle = new Lifecycle(config, cmdOpts);

        app.on('second-instance', async (_: Event, cmdline: string[], _cwd: string) => {
            const newOpts = parseCmdlineOptions(cmdline);
            log.info('Second instance:', cmdline, newOpts);
            await lifecycle.restart(newOpts);
            log.info('Second instance started');
        });

        await lifecycle.runUntilQuit();

        log.info('App quits successfully');
    } catch (err) {
        log.error('App quits due to error:', err.message);
    } finally {
        app.quit();
    }
}
