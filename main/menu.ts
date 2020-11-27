import { Menu, shell, TouchBar } from 'electron';
import { openConfig } from './config';
import { ON_DARWIN, APP_NAME, IS_DEV } from './constants';
import log from './log';

const { TouchBarLabel, TouchBarButton, TouchBarSpacer } = TouchBar;

const DefaultKeyMaps: Required<KeyMapConfig> = {
    'New Tweet': 'CmdOrCtrl+N',
    'Reply to Previous Tweet': 'CmdOrCtrl+R',
    'Click Tweet Button': 'CmdOrCtrl+Enter',
    'Account Settings': 'CmdOrCtrl+,',
    'Open Previous Tweet': 'CmdOrCtrl+Shift+O',
    'Edit Config': null,
};

type A = () => void;

export interface MenuActions {
    quit: A;
    tweet: A;
    reply: A;
    tweetButton: A;
    accountSettings: A;
    switchAccount: (s: string) => Promise<void>;
    openPrevTweet: A;
    debug: A;
}

export interface TouchbarActions {
    tweet: A;
    reply: A;
    openPrevTweet: A;
}

type TouchBarItem = Electron.TouchBarButton | Electron.TouchBarSpacer | Electron.TouchBarLabel;

export function createMenu(userKeyMaps: KeyMapConfig, accounts: string[], actions: MenuActions): Menu {
    const keymaps = Object.assign({}, DefaultKeyMaps, userKeyMaps);

    function actionMenuItem(label: keyof KeyMapConfig, click: A): Electron.MenuItemConstructorOptions {
        const accelerator = keymaps[label];
        if (accelerator === null) {
            return { label, click };
        }
        return { label, click, accelerator };
    }

    const windowSubmenu: Electron.MenuItemConstructorOptions[] = [
        {
            role: 'minimize',
            accelerator: 'CmdOrCtrl+M',
        },
        {
            type: 'separator',
        },
        {
            role: 'close',
            accelerator: 'CmdOrCtrl+W',
        },
    ];

    const editSubmenu: Electron.MenuItemConstructorOptions[] = [
        {
            type: 'separator',
        },
        {
            role: 'undo',
            accelerator: 'CmdOrCtrl+Z',
        },
        {
            role: 'redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
        },
        {
            type: 'separator',
        },
        {
            role: 'cut',
            accelerator: 'CmdOrCtrl+X',
        },
        {
            role: 'copy',
            accelerator: 'CmdOrCtrl+C',
        },
        {
            role: 'paste',
            accelerator: 'CmdOrCtrl+V',
        },
        {
            role: 'selectAll',
            accelerator: 'CmdOrCtrl+A',
        },
        {
            type: 'separator',
        },
        actionMenuItem('New Tweet', actions.tweet),
        actionMenuItem('Reply to Previous Tweet', actions.reply),
        actionMenuItem('Click Tweet Button', actions.tweetButton),
        actionMenuItem('Open Previous Tweet', actions.openPrevTweet),
        actionMenuItem('Account Settings', actions.accountSettings),
        actionMenuItem('Edit Config', openConfig),
    ];
    if (IS_DEV) {
        editSubmenu.push(
            {
                type: 'separator',
            },
            {
                label: 'Open Profile (Debug)',
                click: actions.debug,
            },
        );
    }

    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'Edit',
            submenu: editSubmenu,
        },
        {
            label: 'View',
            submenu: [
                {
                    role: 'reload',
                    click(_, focusedWindow) {
                        if (focusedWindow) {
                            focusedWindow.reload();
                        }
                    },
                    accelerator: '', // Disable shortcut
                },
                {
                    role: 'toggleDevTools',
                },
                {
                    type: 'separator',
                },
                {
                    role: 'resetZoom',
                    accelerator: 'CmdOrCtrl+O',
                },
                {
                    role: 'zoomIn',
                    accelerator: 'CmdOrCtrl+Plus',
                },
                {
                    role: 'zoomOut',
                    accelerator: 'CmdOrCtrl+-',
                },
            ],
        },
        {
            role: 'window',
            submenu: windowSubmenu,
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click() {
                        shell.openExternal('https://github.com/rhysd/tweet-app#readme');
                    },
                },
                {
                    label: 'Search Issues',
                    click() {
                        shell.openExternal('https://github.com/rhysd/tweet-app/issues');
                    },
                },
            ],
        },
    ];

    if (accounts.length > 1) {
        const accountSubmenu = accounts.map(
            (a, i) =>
                ({
                    type: 'radio',
                    checked: i === 0,
                    label: a.startsWith('@') ? a : '@' + a,
                    // XXX: Without this `as`, tsc reports that the value is incompatible with Electron.Accelerator
                    // https://github.com/electron/electron/issues/26716
                    accelerator: `CmdOrCtrl+${i + 1}` as Electron.Accelerator,
                    click() {
                        log.info('Switching account to', a);
                        actions.switchAccount(a);
                    },
                } as const),
        );
        template.splice(template.length - 1, 0, {
            label: 'Accounts',
            submenu: accountSubmenu,
        });
    }

    if (ON_DARWIN) {
        template.unshift({
            label: APP_NAME,
            submenu: [
                {
                    label: 'About ' + APP_NAME,
                    role: 'about',
                },
                {
                    type: 'separator',
                },
                {
                    role: 'services',
                },
                {
                    type: 'separator',
                },
                {
                    role: 'hide',
                    accelerator: 'Command+H',
                },
                {
                    role: 'hideOthers',
                    accelerator: 'Command+Shift+H',
                },
                {
                    role: 'unhide',
                },
                {
                    type: 'separator',
                },
                {
                    label: 'Quit ' + APP_NAME,
                    accelerator: 'Command+Q',
                    click: actions.quit,
                },
            ],
        });

        windowSubmenu.push(
            {
                type: 'separator',
            },
            {
                role: 'front',
            },
        );
    } else {
        template.unshift({
            label: 'File',
            submenu: [
                {
                    label: 'Quit ' + APP_NAME,
                    accelerator: 'CmdOrCtrl+Q',
                    click: actions.quit,
                },
            ],
        });
    }

    return Menu.buildFromTemplate(template);
}

export function dockMenu(tweet: A, reply: A) {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'New Tweet',
            click: tweet,
        },
        {
            label: 'Reply to Previous Tweet',
            click: reply,
        },
    ];
    return Menu.buildFromTemplate(template);
}

export function touchBar(screenName: string | undefined, actions: TouchbarActions) {
    // Cannot add a single instance of TouchBarItem multiple times in a TouchBar
    const smallSpacer = () => new TouchBarSpacer({ size: 'small' });

    function button(label: string, click: A) {
        return new TouchBarButton({
            label,
            backgroundColor: '#1da1f2',
            click,
        });
    }

    const items: TouchBarItem[] = [
        smallSpacer(),
        button('New Tweet', actions.tweet),
        smallSpacer(),
        button('Reply to Previous', actions.reply),
        smallSpacer(),
        button('Open Previous Tweet', actions.openPrevTweet),
    ];

    if (screenName !== undefined) {
        if (!screenName.startsWith('@')) {
            screenName = '@' + screenName;
        }
        items.unshift(smallSpacer(), new TouchBarLabel({ label: screenName }));
    }

    return new TouchBar({ items });
}
