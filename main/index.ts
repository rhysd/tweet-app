import { app, dialog } from 'electron';
import Lifecycle from './lifecycle';
import log from './log';
import { loadConfig } from './config';
import { ON_DARWIN, ICON_PATH } from './constants';
import ContextMenu from './context_menu';

async function go() {
    // default_app sets app.on('window-all-closed', () => app.quit()) before
    // loading this application. We need to disable the callback.
    app.removeAllListeners('window-all-closed');

    function parseCmdlineOptions(args: string[]): CommandLineOptions {
        const idx = args.indexOf('--') + 1;
        if (idx === 0 || idx >= args.length) {
            return { text: '' };
        }
        try {
            return JSON.parse(args[idx]);
        } catch (e) {
            throw new Error(`Cannot parse command line options in main process: ${e}`);
        }
    }

    const contextMenu = new ContextMenu();

    let exitStatus = 0;

    try {
        const cmdOpts = parseCmdlineOptions(process.argv);
        const [config] = await Promise.all([loadConfig(), app.whenReady()]);

        log.info('App is starting with config', config, 'and cmdOpts', cmdOpts);
        const lifecycle = new Lifecycle(config, cmdOpts);

        if (ON_DARWIN) {
            app.dock.setIcon(ICON_PATH);
            app.on('activate', async () => {
                log.info('App activated');
                await lifecycle.restart();
            });
        }

        app.on('second-instance', async (_: Event, cmdline: string[], _cwd: string) => {
            const newOpts = parseCmdlineOptions(cmdline);
            log.info('Second instance:', cmdline, newOpts);
            await lifecycle.restart(newOpts);
            log.info('Second instance started');
        });

        contextMenu.setLifecycle(lifecycle);

        await lifecycle.runUntilQuit();
    } catch (err) {
        log.error('App quits due to error:', err.message);
        exitStatus = 1;
        dialog.showMessageBox({
            type: 'error',
            title: 'Error',
            message: `Tweet app has stopped due to an error: ${err.message}`,
            detail: err.stack,
        });
    } finally {
        app.quit();
        log.info('App quits with exit status', exitStatus);
        process.exit(exitStatus);
    }
}

const locked = app.requestSingleInstanceLock();
if (!locked) {
    app.quit();
} else {
    go();
}
