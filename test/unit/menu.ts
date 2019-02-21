import { deepStrictEqual as eq, ok } from 'assert';
import sinon = require('sinon');
import { createMenu, dockMenu, touchBar } from '../../main/menu';
import { reset } from './mock';

describe('Menu', function() {
    beforeEach(function() {
        reset();
    });

    describe('dockMenu', function() {
        it('calls callbacks on click', function() {
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

    describe('touchBar', function() {
        it('calls callbacks on button clicks', function() {
            const tweet = sinon.fake();
            const reply = sinon.fake();
            const items = (touchBar('screen_name', tweet, reply) as any).args[0].items;

            let item = items.find((i: any) => i.args[0].label === 'New Tweet').args[0];
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(!reply.called);

            item = items.find((i: any) => i.args[0].label === 'Reply to Previous').args[0];
            ok(item, `${item}`);
            item.click();
            ok(tweet.calledOnce);
            ok(reply.calledOnce);
        });

        it('sets screen name as label if available', function() {
            const noop = () => {};
            for (const name of ['name', '@name', undefined]) {
                const items = (touchBar(name, noop, noop) as any).args[0].items;
                const item = items.find((i: any) => i.args[0].label === '@name');
                if (name !== undefined) {
                    ok(item, item);
                } else {
                    eq(item, undefined);
                }
            }
        });
    });

    describe('createMenu', function() {
        const noop = (..._: any[]): any => {};

        it('creates menu items', function() {
            const menu: any = createMenu({}, ['foo'], noop, noop, noop, noop, noop, noop);
            ok(Array.isArray(menu));
            menu.every((i: any) => i.label !== undefined || i.roke !== undefined);
        });

        it('calls proper callback when clicking item', function() {
            const quit = sinon.fake();
            const tweet = sinon.fake();
            const reply = sinon.fake();
            const tweetButton = sinon.fake();

            const menu = (createMenu({}, ['foo'], quit, tweet, reply, tweetButton, noop, noop) as any) as any[];

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

            const q = menu[0].submenu.find((i: any) => i.label === 'Quit Tweet App');
            ok(q);
            q.click();
            ok(quit.calledOnce);

            ok(tweet.calledOnce);
            ok(reply.calledOnce);
            ok(tweetButton.calledOnce);
        });

        it('puts switch account menu for multiple accounts', function() {
            const switchAccount = sinon.fake();
            let menu = (createMenu({}, ['foo'], noop, noop, noop, noop, switchAccount, noop) as any) as any[];

            let accountMenu = menu.find((i: any) => i.label === 'Accounts');
            eq(accountMenu, undefined);

            menu = (createMenu({}, ['foo', '@bar'], noop, noop, noop, noop, switchAccount, noop) as any) as any[];
            accountMenu = menu.find((i: any) => i.label === 'Accounts');
            ok(menu);

            const items = accountMenu.submenu;
            eq(items.map((i: any) => i.label), ['@foo', '@bar']);
            for (const item of items) {
                item.click();
            }

            const calls = switchAccount.getCalls();
            eq(calls.map(c => c.args), [['foo'], ['@bar']]);
        });

        it('sets keymaps as shortcut of menu items', function() {
            const keymaps: KeyMapConfig = {
                'New Tweet': 'CmdOrCtrl+T',
                'Reply to Previous Tweet': 'CmdOrCtrl+I',
                'Click Tweet Button': 'Ctrl+Enter',
                'Edit Config': null,
            };

            const menu = (createMenu(keymaps, ['foo'], noop, noop, noop, noop, noop, noop) as any) as any[];
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
    });
});
