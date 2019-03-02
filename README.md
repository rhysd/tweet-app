<img src="assets/images/icon128x128.png" width="64" height="64" alt="icon"/> Tweet.app
======================================================================================
[![npm version][]][npm]
[![codecov badge][]][codecov]
[![travis badge][]][travis]
[![appveyor badge][]][appveyor]

[Tweet app][repo] is a small desktop application for tweeting on [Twitter][twitter], but never shows
a tweets timeline. It's built on [Twitter Lite][twitter-lite] and [Electron][electron].

- Tweet form the same as mobile official client is available (accurate characters count, emoji picker,
  pictures/movies upload, poll, ...)
- After posting a tweet, the input form is shown again immediately. Timeline never shows up in this app
- Replying to a previously posted tweet is supported
- Multi-account support
- Terminal is first class. A `tweet` command is provided to access to the app
- Customizable. Keyboard shortcuts and lifecycle of the application can be configured
- macOS, Linux and Windows are supported (confirmed with macOS 10.12, Ubuntu 18.04, Windows 10)



## Screenshot

- New tweet

<img src="https://github.com/rhysd/ss/blob/master/tweet-app/new-tweet.png?raw=true" width="712" height="712"/>

- Reply to previously posted tweet

<img src="https://github.com/rhysd/ss/blob/master/tweet-app/reply.png?raw=true" width="712" height="712"/>



## The Problem

While using Twitter, it promotes seeing a tweets timeline. Twitter shows timeline after posting a
tweet. But I want to control the timing to see timeline since it's time consuming especially when
I'm working on something (e.g. coding, debugging, ...).

By separating posting a tweet from seeing timeline, it stops you 'escaping' into a timeline (and
consuming time to see it) and makes you back to your work when posting a tweet. I'm also thinking
that reducing times to see a timeline and actively determine the timing to see it are effective to
avoid SNS addiction.

To achieve the separation, this app only provides the functionality to post tweets.



## Installation

### With `npm` package manager

```
npm install -g tweet-app
```

`electron` package is a peer-dependency so it is not installed automatically. If you have not
installed the package yet. Please install it additionally.

```
npm install -g electron
```

If you have already installed the app from [release page][release], setting the environment variable
or passing the path via command line option will use the installed app.

For example (on macOS):

```
export TWEET_APP_ELECTRON_EXECUTABLE=/Applications/Tweet.app/Contents/MacOS/Tweet

# or

alias tweet='tweet --electron-path=/Applications/Tweet.app/Contents/MacOS/Tweet'
```

### From [release page][release]

Installers for each platforms are ready at [releases page][release].
Please download it for your platform and double click it to install.

- **macOS**: `Tweet-x.y.z.dmg` or `Tweet-0.2.0-mac.zip`
- **Linux**: `Tweet x.y.z.AppImage` (in [AppImage][appimage] format) or `tweet-app-x.y.z-linux.zip`
- **Windows**: `Tweet Setup.x.y.z.exe` (as [NSIS][nsis] installer)

For setting up `tweet` command, please make a symbolic link to `app/bin/cli.js` in resources
directory. It requires `node` executable to run.

For example, on macOS:

```
$ ln -s /path/to/Tweet.app/Contents/Resources/app/bin/cli.js /usr/local/bin/tweet
```

Note: On macOS, trying to install app may be rejected by OS at first time since this app is not
signed with code signing. In the case, please install from it 'Preferences -> Security'.

Note: Please do not move `cli.js` to other directory since it locates Electron binary depending on
its file path. Otherwise, you need to pass `--electron-path` option.



## Usage

### Basic Usage

When starting app at first, You'll see login page. It's actually https://mobile.twitter.com/login
so please enter your login information.  Then the page will be redirected to tweet form.

Note: Please consider to create a configuration file `config.json` to enable some functionality.
Since Twitter Lite does not expose a screen name in DOM, setting it to `default_account` is
necessary to notify this app your screen name. Please see 'Customization' section for the detail.

The tweet form is exactly the same as the input form of https://mobile.twitter.com/compose/tweet.
All functionalities like accurate characters count, picture/movie upload, emoji picker, poll are
available. Clicking '+' chains additional tweets.

Menu items are in menu bar on macOS, and in a window tool bar on Windows and Linux. By default,
the window hides a tool bar on Windows and Linux. To reveal it, please type <kbd>Alt</kbd>.

By clicking 'Tweet' (or 'Tweet All') button, it sends your tweet(s) to Twitter. And it returns to
'New Tweet' input form again instead of showing a timeline.

This app uses accessibility label in some features. For example it finds out an element for 'Tweet'
button based on the label and only English and Japanese are supported for now. If you find your
language is not supported, please create an issue to request a support.

### Reply to Previous Tweet

After posting a tweet, you may want to chain a new tweet by replying to the previous tweet. This app
remembers the previous tweet on memory. Selecting 'Reply to Previous Tweet' in 'Edit' menu shows an
input form to reply to your previous tweet.

### Command Usage in Terminal

```
Usage: tweet [options] [text]

Desktop application for tweeting. Timeline never shows up.

Options:
  -V, --version              output the version number
  -t --hashtags <list>       comma-separated list of hashtags (e.g. "js,react,node")
  -a --after-tweet <action>  what to do after posting tweet. One of 'new tweet', 'reply previous', 'close', 'quit'
  --no-detach                do not detach process from shell
  -r --reply                 reply to tweet sent previously. This option is only effective when app is already running
  --electron-path <path>     file path to Electron executable to run app
  -h, --help                 output usage information
```

The command opens GUI window and a tweet form. At first, you need to login as
normal mobile.twitter.com.

Please see `tweet --help` for command line options.

### Run This App as Background App

By setting `quit_on_close` to `false` in configuration, app does not quit even if you close the
window. It remains as 'background app' in system. When app is started again next time by clicking
application icon in launcher or dock, the background app is activated and it shows a window again.

To stop the application, please choose 'Quit' from menu item or context menu at dock.

For configuration, please see 'Customization' section for more detail. For performance of the
background app, please see 'Performance' section as well.

### Multi-account

This app supports configuring multiple accounts. By setting additional accounts to `other_accounts`
in configuration, you can switch accounts from 'Accounts' menu. When switching accounts, the window
is created again to switch login session. For configuration, please read following 'Customization'
section.



## Customization

Behavior of this app can be configured with JSON configuration file.
The configuration file and all values in it are optional.
`default_account` is recommended to be set since some features of this app is depending on it.

### Configuration File

Please put a JSON file named `config.json` at application's data directory.

- `~/Library/Application Support/Tweet/config.json` on macOS
- `$XDG_CONFIG_HOME/Tweet/config.json` or `~/.config/Tweet/config.json` on Linux
- `%APPDATA%\Tweet\config.json` on Windows

### `default_account` (`String`)

Screen name (`@name`) used by default. `@` can be omitted. If this value is not set, some features
of this app are unavailable. Especially 'Reply to Previous Tweet' feature is not available. This
app extracts your last tweet from timeline drawn after posting a new tweet, but it requires your
screen name. Twitter Lite does not expose a screen name in DOM, so this app needs to know it from
configuration.

I recommend to set this value.

### `other_accounts` (`Array<String>`)

An array of screen names. These accounts can be switched from 'Accounts' menu.

### `keymaps` (`Object<String | Null>`)

Object of key shortcut mappings. Key string is a label of menu item. Value is string representing
key combination as [Electron's accelerator][accelerator] or `null`. For example,
`"Click Tweet Button": "CmdOrCtrl+Shift+Enter"` changes keyboard shortcut for clicking tweet button
from keyboard to <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd>. When `null` is set, key
shortcut is cleared for the menu item.

### `after_tweet` (`String`)

What this app should do after posting a tweet as string value. Possible values are as follows:

- `"new tweet"`: Back to 'New Tweet' page.
- `"reply previous"`: Back to 'Reply to Previous Tweet' page. It's useful when you often chain your
  tweets.
- `"close"`: Close and unfocus the app but not quit. This is the same as `"quit"` when
  `quit_on_close` is set to `true`. It's useful when you want to back to your work after posting a
  new tweet.
- `"quit"`: Quit the app.

Default behavior is `"new tweet"`.

### `hotkey` (`String`)

Hot key shortcut as string. Format is the same as `keymaps` values ([Electron's accelerator][accelerator]).

The key shortcut is global to toggle window of this app. It enables to access to this app from
anywhere with one key shortcut. Please be careful to define this key shortcut since it overwrites
existing key shortcut.

By default no hot key is defined.

### `quit_on_close` (`Boolean`)

When `true`, this app quits after closing a window. This is a default behavior
on Linux and Windows.

When `false`, this app does not quit. It means that main process does not die, but renderer process
ends when closing the window. It means that this app goes to background apps after closing a window.
Please read 'Performance' about background app performance. This is a default behavior on macOS.

### `window` (`Object<Number>`)

Window's properties as key-values of object. Key-values are as follows:

- `width`: Width of window in pixels
- `height`: Height of window in pixels
- `zoom`: Zoom factor of font size in float number. `1.0` means `100%`

### Configuration Example

Here is my own configuration:

```json
{
  "default_account": "@Linda_pp",
  "other_accounts": [],
  "keymaps": {
    "Click Tweet Button": "CmdOrCtrl+Shift+Enter"
  },
  "after_tweet": "close",
  "window": {
    "width": 450,
    "height": 420,
    "zoom": 0.8
  }
}
```



## FAQ

### How can I enable dark mode?

1. Choose 'Toggle Developer Tools' from 'View' menu
2. Move to 'console' tab in DevTools
3. Enter JavaScript `location.href = 'https://mobile.twitter.com'`
4. Click your icon at top left of the window to open account menu
5. Click toggle switch of dark mode
6. Close DevTools and click 'New Tweet' from 'Edit' menu to back

### How can I delete a tweet previously posted?

1. Click 'Open Previous Tweet' item in 'Edit' menu
2. Find a dropdown menu at top right
3. Click 'Delete' item in the dropdown menu
4. After deleting the tweet, automatically redirect to 'New Tweet' page



## Performance

While a window is closed, renderer process is shutdown and there are only main process and GPU process.
Total memory footprint is around 70MB and CPU usage is 0.0%.
When opening a window, a renderer process is created. Memory usage and CPU usage of the renderer
process are depending on rendered contents https://mobile.twitter.com .



## Feedback

If you're facing some bug or having any feature request, please report it from
[Issues page](https://github.com/rhysd/tweet-app/issues). Pull requests are more than welcome.



## Alternatives

[tweet-tray](https://github.com/jonathontoon/tweet-tray) is a nice application created with the same
motivation as this app. However it does not support chaining tweets by replying to previous tweet
and some functionality such as emoji picker.



## License

Distributed under [the MIT License](./LICENSE.txt).

Some icon was provided by [feather icons][feathericons] (`Copyright (c) 2013-2017 Cole Bemis`).

[npm version]: https://badge.fury.io/js/tweet-app.svg
[npm]: https://www.npmjs.com/package/tweet-app
[travis badge]: https://travis-ci.org/rhysd/tweet-app.svg?branch=master
[travis]: https://travis-ci.org/rhysd/tweet-app
[appveyor badge]: https://ci.appveyor.com/api/projects/status/nn6mtwssph025r79?svg=true
[appveyor]: https://ci.appveyor.com/project/rhysd/tweet-app
[codecov badge]: https://codecov.io/gh/rhysd/tweet-app/branch/master/graph/badge.svg
[codecov]: https://codecov.io/gh/rhysd/tweet-app
[repo]: https://github.com/rhysd/tweet-app
[twitter]: https://twitter.com
[twitter-lite]: https://play.google.com/store/apps/details?id=com.twitter.android.lite
[electron]: https://electronjs.org
[release]: https://github.com/rhysd/tweet-app/releases
[accelerator]: https://electronjs.org/docs/api/accelerator
[feathericons]: https://feathericons.com/
[appimage]: https://appimage.org/
[nsis]: https://sourceforge.net/projects/nsis/
