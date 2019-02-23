// These type definitions are used across main process, renderer process and bin/cli.ts.

interface KeyMapConfig {
    'New Tweet'?: string | null;
    'Reply to Previous Tweet'?: string | null;
    'Click Tweet Button'?: string | null;
    'Account Settings'?: string | null;
    'Edit Config'?: string | null;
}

type ConfigAfterTweet = 'new tweet' | 'reply previous' | 'close' | 'quit';
interface Config {
    default_account?: string;
    other_accounts?: string[];
    keymaps?: KeyMapConfig;
    after_tweet?: ConfigAfterTweet;
    hotkey?: string;
    quit_on_close?: boolean;
}

interface CommandLineOptions {
    hashtags?: string[];
    afterTweet?: ConfigAfterTweet;
    reply?: boolean;
    text: string;
}

declare namespace IPC {
    type Chan =
        | 'tweetapp:action-after-tweet'
        | 'tweetapp:sent-tweet'
        | 'tweetapp:screen-name'
        | 'tweetapp:prev-tweet-id'
        | 'tweetapp:open'
        | 'tweetapp:click-tweet-button'
        | 'tweetapp:login'
        | 'tweetapp:exit-app';
}
