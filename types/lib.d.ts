// These type definitions are used across main process, renderer process and bin/cli.ts.

interface KeyMapConfig {
    'New Tweet'?: string | null;
    'Reply to Previous Tweet'?: string | null;
    'Click Tweet Button'?: string | null;
    'Edit Config'?: string | null;
}

type ConfigAfterTweet = 'new tweet' | 'reply previous' | 'close' | 'quit';
interface Config {
    default_account?: string;
    keymaps?: KeyMapConfig;
    after_tweet?: ConfigAfterTweet;
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
        | 'tweetapp:exit-app';
}