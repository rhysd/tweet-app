// These type definitions are used across main process, renderer process and bin/cli.ts.

interface Config {
    default_account?: string;
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
