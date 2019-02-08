import { app } from 'electron';
import contextMenu = require('electron-context-menu');
import TweetWindow from './window';
import log from './log';
import { loadConfig } from './config';

contextMenu();

Promise.all([loadConfig(), app.whenReady()]).then(([config, _]) => {
    log.info('Electron is ready');
    const win = new TweetWindow(config);
    win.didCloseWindow = () => {
        log.info('Window was closed. Application will quit');
        app.quit();
    };
    win.open().then(() => log.info('App started'));
});
