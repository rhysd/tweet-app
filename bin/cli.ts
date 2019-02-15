#! /usr/bin/env node

import * as cp from 'child_process';
import { join } from 'path';
import commander = require('commander');

const AfterTweetActions: ConfigAfterTweet[] = ['new tweet', 'reply previous', 'close', 'quit'];

const { hashtags, args, afterTweet } = commander
    .version('0.0.2')
    .usage('[options] [text]')
    .option('-t --hashtags <list>', 'Comma-separated list of hashtags', s => s.split(','))
    .option(
        '-a --after-tweet <action>',
        'What to do after sending tweet. One of ' + AfterTweetActions.map(a => `'${a}'`).join(', '),
        (s: string) => s.toLowerCase(),
    )
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
};

// XXX: In node context, require('electron') returns a string which represents path to electron
// binary in electron npm package.
const electron = require('electron') as any;

// First argument is path to `node`, second argument is path to script
const argv = [join(__dirname, '..'), '--', JSON.stringify(opts)];

cp.spawn(electron, argv, {
    stdio: 'inherit',
});
