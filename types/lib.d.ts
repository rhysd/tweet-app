// These type definitions are used across main process, renderer process and bin/cli.ts.

interface KeyMapConfig {
    'New Tweet'?: string | null;
    'Reply to Previous Tweet'?: string | null;
    'Click Tweet Button'?: string | null;
    'Edit Config'?: string | null;
}

interface Config {
    default_account?: string;
    keymaps?: KeyMapConfig;
}

interface CommandLineOptions {
    hashtags?: string[];
    text: string;
}

declare namespace IPC {
    type Chan =
        | 'tweetapp:config'
        | 'tweetapp:sent-tweet'
        | 'tweetapp:screen-name'
        | 'tweetapp:prev-tweet-id'
        | 'tweetapp:open'
        | 'tweetapp:click-tweet-button';
}
