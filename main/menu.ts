import { Menu, shell } from 'electron';
import { openConfig } from './config';
import { ON_DIRWIN, APP_NAME, IS_DEV } from './constants';

const DefaultKeyMaps: Required<KeyMapConfig> = {
    'New Tweet': 'CmdOrCtrl+T',
    'Reply to Previous Tweet': 'CmdOrCtrl+R',
    'Click Tweet Button': 'CmdOrCtrl+Enter',
    'Edit Config': null,
};

type A = () => void;
export default function createMenu(config: KeyMapConfig, quit: A, tweet: A, reply: A, tweetButton: A, debug: A): Menu {
    const keymaps = Object.assign({}, DefaultKeyMaps, config);
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

    const actionSubmenu: Electron.MenuItemConstructorOptions[] = [
        actionMenuItem('New Tweet', tweet),
        actionMenuItem('Reply to Previous Tweet', reply),
        {
            type: 'separator',
        },
        actionMenuItem('Click Tweet Button', tweetButton),
        {
            type: 'separator',
        },
        actionMenuItem('Edit Config', openConfig),
    ];
    if (IS_DEV) {
        actionSubmenu.push(
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
            label: 'Action',
            submenu: actionSubmenu,
        },
        {
            label: 'Edit',
            submenu: [
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
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    role: 'reload',
                    click(_, focusedWindow) {
                        if (focusedWindow) focusedWindow.reload();
                    },
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
                        shell.openExternal('http://github.com/rhysd/tweet-app#readme');
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

    if (ON_DIRWIN) {
        template.unshift({
            label: 'Tweet App',
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
                    // submenu: [],
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
