// These type definitions are used across main process, renderer process and bin/cli.ts.

export interface KeyMapConfig {
    'New Tweet'?: string | null;
    'Reply to Previous Tweet'?: string | null;
    'Click Tweet Button'?: string | null;
    'Account Settings'?: string | null;
    'Edit Config'?: string | null;
    'Open Previous Tweet'?: string | null;
    'Cancel Tweet'?: string | null;
}

export type ConfigAfterTweet = 'new tweet' | 'reply previous' | 'close' | 'quit';
export interface WindowConfig {
    width?: number;
    height?: number;
    zoom?: number;
    auto_hide_menu_bar?: boolean;
    visible_on_all_workspaces?: boolean;
}
export interface MutableConfig {
    default_account?: string;
    other_accounts?: string[];
    keymaps?: KeyMapConfig;
    after_tweet?: ConfigAfterTweet;
    hotkey?: string;
    quit_on_close?: boolean;
    window?: WindowConfig;
}
export type Config = Readonly<MutableConfig>;

export interface MutableCommandLineOptions {
    hashtags?: string[];
    afterTweet?: ConfigAfterTweet;
    reply?: boolean;
    text: string;
}
export type CommandLineOptions = Readonly<MutableCommandLineOptions>;

export type OnlineStatus = 'online' | 'offline';

export type IpcFromMain =
    | 'tweetapp:action-after-tweet'
    | 'tweetapp:screen-name'
    | 'tweetapp:open'
    | 'tweetapp:click-tweet-button'
    | 'tweetapp:cancel-tweet'
    | 'tweetapp:sent-tweet'
    | 'tweetapp:unlink-tweet'
    | 'tweetapp:login';
export type IpcFromRenderer =
    | 'tweetapp:prev-tweet-id'
    | 'tweetapp:online-status'
    | 'tweetapp:exit-app'
    | 'tweetapp:reset-window';
