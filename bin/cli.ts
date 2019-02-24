#! /usr/bin/env node

import * as cp from 'child_process';
import * as path from 'path';
import { join } from 'path';
import commander = require('commander');

let electron: string | undefined;
switch (process.platform) {
    case 'darwin':
        if (__dirname.endsWith(path.join('Resources', 'bin'))) {
            electron = path.join(__dirname, '..', '..', 'MacOS', 'Tweet');
        }
        break;
    case 'linux':
        if (__dirname.endsWith(path.join('resources', 'bin'))) {
            electron = path.join(__dirname, '..', '..', 'tweet-app');
        }
        break;
    case 'win32':
        if (__dirname.endsWith(path.join('resources', 'bin'))) {
            electron = path.join(__dirname, '..', '..', 'Tweet.exe');
        }
        break;
    default:
        break;
}

if (electron === undefined) {
    try {
        // XXX: In node context, require('electron') returns a string which represents path to electron
        // binary in electron npm package.
        electron = require('electron') as any;
    } catch (e) {
        throw new Error(
            `Cannot find Electron executable. Please run \`npm install -g electron\` or install Tweet app from https://github.com/rhysd/tweet-app/releases: ${e}`,
        );
    }
}

const AfterTweetActions: ConfigAfterTweet[] = ['new tweet', 'reply previous', 'close', 'quit'];

const { hashtags, args, afterTweet, detach, reply } = commander
    .command('tweet')
    .version('0.0.5')
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

if (detach) {
    // TODO?: Output stderr to $DATA_DIR/log.txt
    cp.spawn(electron!, argv, {
        stdio: 'ignore',
        detached: true,
    }).unref();
} else {
    const app = cp.spawn(electron!, argv, {
        stdio: 'inherit',
    });
    app.on('exit', code => {
        process.exit(typeof code === 'number' ? code : 3);
    });
}
