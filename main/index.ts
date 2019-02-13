import { app } from 'electron';
import contextMenu = require('electron-context-menu');
import runApp from './app';
import log from './log';
import { loadConfig } from './config';

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

const cmdOpts = parseCmdlineOptions(process.argv);

log.info('Command line arguments:', cmdOpts);

contextMenu();

Promise.all([loadConfig(), app.whenReady()])
    .then(([config, _]) => runApp(config, cmdOpts))
    .catch(e => log.error(e))
    .then(() => app.quit());
