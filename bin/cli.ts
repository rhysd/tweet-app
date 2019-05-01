#!/usr/bin/env node

import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { join } from 'path';
import commander = require('commander');

function electronExePath(opts: string | undefined): string {
    const specified = opts || process.env.TWEET_APP_ELECTRON_EXECUTABLE;
    if (specified !== undefined) {
        try {
            const { X_OK, R_OK } = fs.constants;
            fs.accessSync(specified, R_OK | X_OK);
            // Now the path exists
            return specified;
        } catch (e) {
            throw new Error(
                `Executable '${specified}' specified by $TWEET_APP_ELECTRON_EXECUTABLE does not exist: ${e}`,
            );
        }
    }

    switch (process.platform) {
        case 'darwin':
            // Tweet.app/Contents/Resource/bin
            if (__dirname.endsWith(path.join('Resources', 'app', 'bin'))) {
                // Tweet.app/Contents/MacOS/Tweet
                return path.join(__dirname, '..', '..', '..', 'MacOS', 'Tweet');
            }
            break;
        case 'linux':
            // tweet-app/resources/bin
            if (__dirname.endsWith(path.join('resources', 'app', 'bin'))) {
                // tweet-app/tweet-app
                return path.join(__dirname, '..', '..', '..', 'tweet-app');
            }
            break;
        case 'win32':
            // tweet-app/resources/bin
            if (__dirname.endsWith(path.join('resources', 'app', 'bin'))) {
                // tweet-app/Tweet.exe
                return path.join(__dirname, '..', '..', '..', 'Tweet.exe');
            }
            break;
        default:
            break;
    }

    try {
        // XXX: In node context, require('electron') returns a string which represents path to electron
        // binary in electron npm package.
        return require('electron') as any;
    } catch (e) {
        throw new Error(
            `Cannot find Electron executable. Please run \`npm install -g electron\` or install Tweet app from https://github.com/rhysd/tweet-app/releases: ${e}`,
        );
    }
}

const AfterTweetActions: ConfigAfterTweet[] = ['new tweet', 'reply previous', 'close', 'quit'];

const { hashtags, args, afterTweet, detach, reply, electronPath } = commander
    .command('tweet')
    .version('0.2.3')
    .usage('[options] [text]')
    .description('Desktop application for tweeting. Timeline never shows up.')
    .option('-t --hashtags <list>', 'comma-separated list of hashtags (e.g. "js,react,node")', s =>
        s.split(',').map((t: string) => t.trim()),
    )
    .option(
        '-a --after-tweet <action>',
        'what to do after posting tweet. One of ' + AfterTweetActions.map(a => `'${a}'`).join(', '),
        (s: string) => s.toLowerCase(),
    )
    .option('--no-detach', 'do not detach process from shell', false)
    .option('-r --reply', 'reply to tweet sent previously. This option is only effective when app is already running')
    .option('--electron-path <path>', 'file path to Electron executable to run app')
    .parse(process.argv);

// Verify --after-tweet
if (afterTweet !== undefined && !AfterTweetActions.includes(afterTweet)) {
    console.error('Unknown action for --after-tweet:', afterTweet);
    process.exit(100);
}

const opts: CommandLineOptions = {
    hashtags,
    afterTweet,
    text: args.join(' '),
    reply,
};

// First argument is path to `node`, second argument is path to script
const argv = [join(__dirname, '..'), '--', JSON.stringify(opts)];

// Otherwise the electron process will exit immediately since the executable is run as node.
delete process.env.ELECTRON_RUN_AS_NODE;

if (detach) {
    // TODO?: Output stderr to $DATA_DIR/log.txt
    cp.spawn(electronExePath(electronPath), argv, {
        stdio: 'ignore',
        detached: true,
    }).unref();
} else {
    const app = cp.spawn(electronExePath(electronPath), argv, {
        stdio: 'inherit',
    });
    app.on('exit', code => {
        process.exit(typeof code === 'number' ? code : 3);
    });
}
