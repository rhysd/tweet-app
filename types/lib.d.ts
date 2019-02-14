// These type definitions are used across main process, renderer process and bin/cli.ts.

interface Config {}

interface CommandLineOptions {
    hashtags?: string[];
    text: string;
}

declare namespace IPC {
    type Chan = 'tweetapp:config' | 'tweetapp:sent-tweet';
}
