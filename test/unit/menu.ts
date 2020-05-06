import { deepStrictEqual as eq, ok } from 'assert';
import sinon = require('sinon');
import { createMenu, dockMenu, touchBar, MenuActions, TouchbarActions } from '../../main/menu';
import { reset } from './mock';

const { shell } = require('electron') as any; // mocked

function noop(..._: any[]): any {
    /* noop */
}

const EMPTY_MENU_ACTIONS: MenuActions = {
    quit: noop,
    tweet: noop,
    reply: noop,
    tweetButton: noop,
    accountSettings: noop,
    openPrevTweet: noop,
    switchAccount: noop,
    debug: noop,
};

const EMPTY_TOUCHBAR_ACTIONS: TouchbarActions = {
    tweet: noop,
    reply: noop,
    openPrevTweet: noop,
};

describe('Menu', function () {
    beforeEach(reset);

    describe('dockMenu', function () {
        it('calls callbacks on click', function () {
            const tweet = sinon.fake();
            const reply = sinon.fake();
            const items: any = dockMenu(tweet, reply);

            let item = items.find((i: any) => i.label === 'New Tweet');
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(!reply.called);

            item = items.find((i: any) => i.label === 'Reply to Previous Tweet');
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(reply.calledOnce);
        });
    });

    describe('touchBar', function () {
        it('calls callbacks on button clicks', function () {
            const tweet = sinon.fake();
            const reply = sinon.fake();
            const openPrevTweet = sinon.fake();
            const actions = {
                ...EMPTY_TOUCHBAR_ACTIONS,
                tweet,
                reply,
                openPrevTweet,
            };
            const items = (touchBar('screen_name', actions) as any).args[0].items;

            let item = items.find((i: any) => i.args[0].label === 'New Tweet').args[0];
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(!reply.called);
            ok(!openPrevTweet.called);

            item = items.find((i: any) => i.args[0].label === 'Reply to Previous').args[0];
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(reply.calledOnce);
            ok(!openPrevTweet.called);

            item = items.find((i: any) => i.args[0].label === 'Open Previous Tweet').args[0];
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(reply.calledOnce);
            ok(openPrevTweet.called);
        });

        it('sets screen name as label if available', function () {
            for (const name of ['name', '@name', undefined]) {
                const items = (touchBar(name, EMPTY_TOUCHBAR_ACTIONS) as any).args[0].items;
                const item = items.find((i: any) => i.args[0].label === '@name');
                if (name !== undefined) {
                    ok(item, item);
                } else {
                    eq(item, undefined);
                }
            }
        });
    });

    describe('createMenu', function () {
        it('creates menu items', function () {
            const menu: any = createMenu({}, ['foo'], EMPTY_MENU_ACTIONS);
            ok(Array.isArray(menu));
            menu.every((i: any) => i.label !== undefined || i.role !== undefined);
        });

        it('calls proper callback when clicking item', function () {
            const quit = sinon.fake();
            const tweet = sinon.fake();
            const reply = sinon.fake();
            const tweetButton = sinon.fake();
            const accountSettings = sinon.fake();
            const openPrevTweet = sinon.fake();

            const actions = {
                ...EMPTY_MENU_ACTIONS,
                quit,
                tweet,
                reply,
                tweetButton,
                accountSettings,
                openPrevTweet,
            };

            const menu = (createMenu({}, ['foo'], actions) as any) as any[];

            const edit = menu.find((i: any) => i.label === 'Edit');
            ok(edit);

            const tw = edit.submenu.find((i: any) => i.label === 'New Tweet');
            ok(tw);
            tw.click();
            ok(tweet.calledOnce);

            const rep = edit.submenu.find((i: any) => i.label === 'Reply to Previous Tweet');
            ok(rep);
            rep.click();
            ok(reply.calledOnce);

            const btn = edit.submenu.find((i: any) => i.label === 'Click Tweet Button');
            ok(btn);
            btn.click();
            ok(tweetButton.calledOnce);

            const settings = edit.submenu.find((i: any) => i.label === 'Account Settings');
            ok(settings);
            settings.click();
            ok(accountSettings.calledOnce);

            const open = edit.submenu.find((i: any) => i.label === 'Open Previous Tweet');
            ok(open);
            open.click();
            ok(openPrevTweet.calledOnce);

            const q = menu[0].submenu.find((i: any) => i.label === 'Quit Tweet App');
            ok(q);
            q.click();
            ok(quit.calledOnce);

            ok(tweet.calledOnce);
            ok(reply.calledOnce);
            ok(tweetButton.calledOnce);
            ok(accountSettings.calledOnce);
            ok(openPrevTweet.calledOnce);
        });

        it('puts switch account menu for multiple accounts', function () {
            const switchAccount = sinon.fake();
            const actions = {
                ...EMPTY_MENU_ACTIONS,
                switchAccount,
            };
            let menu = (createMenu({}, ['foo'], actions) as any) as any[];

            let accountMenu = menu.find((i: any) => i.label === 'Accounts');
            eq(accountMenu, undefined);

            menu = (createMenu({}, ['foo', '@bar'], actions) as any) as any[];
            accountMenu = menu.find((i: any) => i.label === 'Accounts');
            ok(menu);

            const items = accountMenu.submenu;
            eq(
                items.map((i: any) => i.label),
                ['@foo', '@bar'],
            );
            for (const item of items) {
                item.click();
            }

            const calls = switchAccount.getCalls();
            eq(
                calls.map(c => c.args),
                [['foo'], ['@bar']],
            );
        });

        it('sets keymaps as shortcut of menu items', function () {
            const keymaps: KeyMapConfig = {
                'New Tweet': 'CmdOrCtrl+T',
                'Reply to Previous Tweet': 'CmdOrCtrl+I',
                'Click Tweet Button': 'Ctrl+Enter',
                'Account Settings': 'CmdOrCtrl+S',
                'Edit Config': null,
            };

            const menu = (createMenu(keymaps, ['foo'], EMPTY_MENU_ACTIONS) as any) as any[];
            const edit = menu.find((i: any) => i.label === 'Edit');
            for (const name of Object.keys(keymaps)) {
                const item = edit.submenu.find((i: any) => i.label === name);
                const map: string | null = (keymaps as any)[name];
                if (map === null) {
                    eq(item.accelerator, undefined);
                } else {
                    eq(item.accelerator, map);
                }
            }
        });

        describe('Help menu', function () {
            let menu: any[];
            let help: any[];

            beforeEach(function () {
                menu = createMenu({}, ['foo'], EMPTY_MENU_ACTIONS) as any;
                help = menu.find((m: any) => m.role === 'help').submenu;
            });

            it('opens README on "Learn More"', function () {
                help[0].click();
                ok(shell.openExternal.calledOnce);
                eq(shell.openExternal.lastCall.args[0], 'https://github.com/rhysd/tweet-app#readme');
            });

            it('opens Issues page on "Search Issues"', function () {
                help[1].click();
                ok(shell.openExternal.calledOnce);
                eq(shell.openExternal.lastCall.args[0], 'https://github.com/rhysd/tweet-app/issues');
            });
        });
    });
});
