#! /usr/bin/env node

import * as cp from 'child_process';
import { join } from 'path';
import commander = require('commander');

const { hashtags, args, afterTweet } = commander
    .version('0.0.2')
    .usage('[options] <text>')
    .option('-t --hashtags [list]', 'Comma-separated list of hashtags', s => s.split(','))
    .option(
        '-a --after-tweet [action]',
        "What to do after sending tweet. One of 'new tweet', 'reply previous', 'close', 'quit'",
        s => s.toLowerCase(),
    )
    .parse(process.argv);

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
