import { Menu, shell } from 'electron';
import Ipc from './ipc';
import { ON_DIRWIN, CONFIG_FILE, APP_NAME } from './constants';

// TODO: Add 'Page' menu list
export default function createMenu(_ipc: Ipc, quit: () => void): Menu {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Edit Config',
                    click() {
                        shell.openItem(CONFIG_FILE);
                    },
                },
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
                    accelerator: 'CmdOrCtrl+R',
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
            submenu: [
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
            ],
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
                    role: 'quit',
                    accelerator: 'Command+Q',
                    click() {
                        quit();
                    },
                },
            ],
        });
        const winMenu = template.find(m => m.role === 'window')!.submenu! as Electron.MenuItemConstructorOptions[];
        winMenu.push(
            {
                type: 'separator',
            },
            {
                role: 'front',
            },
        );
    }

    return Menu.buildFromTemplate(template);
}
