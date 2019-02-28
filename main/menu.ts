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
export function createMenu(
    userKeyMaps: KeyMapConfig,
    accounts: string[],
    quit: A,
    tweet: A,
    reply: A,
    tweetButton: A,
    accountSettings: A,
    switchAccount: (s: string) => Promise<void>,
    openPrevTweet: A,
    debug: A,
): Menu {
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
            role: 'selectall',
            accelerator: 'CmdOrCtrl+A',
        },
        {
            type: 'separator',
        },
        actionMenuItem('New Tweet', tweet),
        actionMenuItem('Reply to Previous Tweet', reply),
        actionMenuItem('Click Tweet Button', tweetButton),
        actionMenuItem('Open Previous Tweet', openPrevTweet),
        actionMenuItem('Account Settings', accountSettings),
        actionMenuItem('Edit Config', openConfig),
    ];
    if (IS_DEV) {
        editSubmenu.push(
            {
                type: 'separator',
            },
            {
                label: 'Open Profile (Debug)',
                click: debug,
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
                    role: 'toggledevtools',
                },
                {
                    type: 'separator',
                },
                {
                    role: 'resetzoom',
                    accelerator: 'CmdOrCtrl+O',
                },
                {
                    role: 'zoomin',
                    accelerator: 'CmdOrCtrl+Plus',
                },
                {
                    role: 'zoomout',
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
        const accountSubmenu = accounts.map((a, i) => ({
            type: 'radio' as 'radio',
            checked: i === 0,
            label: a.startsWith('@') ? a : '@' + a,
            accelerator: `CmdOrCtrl+${i + 1}`,
            click() {
                log.info('Switching account to', a);
                switchAccount(a);
            },
        }));
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
                    role: 'hideothers',
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
                    click: quit,
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
                    click: quit,
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

export function touchBar(screenName: string | undefined, tweet: A, reply: A) {
    const smallSpacer = new TouchBarSpacer({ size: 'small' });
    const items = [
        smallSpacer,
        new TouchBarButton({
            label: 'New Tweet',
            backgroundColor: '#1da1f2',
            click: tweet,
        }),
        smallSpacer,
        new TouchBarButton({
            label: 'Reply to Previous',
            backgroundColor: '#1da1f2',
            click: reply,
        }),
    ];

    if (screenName !== undefined) {
        if (!screenName.startsWith('@')) {
            screenName = '@' + screenName;
        }
        items.unshift(smallSpacer, new TouchBarLabel({ label: screenName }));
    }

    return new TouchBar({ items });
}
