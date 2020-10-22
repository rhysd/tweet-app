// These type definitions are used across main process, renderer process and bin/cli.ts.

interface KeyMapConfig {
    'New Tweet'?: string | null;
    'Reply to Previous Tweet'?: string | null;
    'Click Tweet Button'?: string | null;
    'Account Settings'?: string | null;
    'Edit Config'?: string | null;
    'Open Previous Tweet'?: string | null;
}

type ConfigAfterTweet = 'new tweet' | 'reply previous' | 'close' | 'quit';
interface WindowConfig {
    width?: number;
    height?: number;
    zoom?: number;
    auto_hide_menu_bar?: boolean;
    visible_on_all_workspaces?: boolean;
}
interface MutableConfig {
    default_account?: string;
    other_accounts?: string[];
    keymaps?: KeyMapConfig;
    after_tweet?: ConfigAfterTweet;
    hotkey?: string;
    quit_on_close?: boolean;
    window?: WindowConfig;
}
type Config = Readonly<MutableConfig>;

interface MutableCommandLineOptions {
    hashtags?: string[];
    afterTweet?: ConfigAfterTweet;
    reply?: boolean;
    text: string;
}
type CommandLineOptions = Readonly<MutableCommandLineOptions>;

type OnlineStatus = 'online' | 'offline';

declare namespace IpcChan {
    type FromMain =
        | 'tweetapp:action-after-tweet'
        | 'tweetapp:screen-name'
        | 'tweetapp:open'
        | 'tweetapp:click-tweet-button'
        | 'tweetapp:sent-tweet'
        | 'tweetapp:unlink-tweet'
        | 'tweetapp:login';
    type FromRenderer = 'tweetapp:prev-tweet-id' | 'tweetapp:online-status' | 'tweetapp:exit-app';
}
