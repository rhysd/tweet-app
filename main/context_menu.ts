import { ContextMenuParams, MenuItem } from 'electron';
import contextMenu = require('electron-context-menu');
import log from './log';
import Lifecycle from './lifecycle';

export default class ContextMenu {
    app: Lifecycle | null = null;

    constructor() {
        contextMenu({
            prepend: (_, params) => {
                return [this.itemUnlink(params)];
            },
        });
    }

    public setLifecycle(l: Lifecycle) {
        this.app = l;
    }

    private itemUnlink(params: ContextMenuParams): MenuItem {
        const sel = params.selectionText || '';
        return {
            label: 'Unlink auto links',
            visible: true,
            checked: false,
            click: this.unlink.bind(this, sel),
            enabled: sel !== '',
        };
    }

    private unlink(text: string) {
        if (this.app === null) {
            log.debug('Cannot handle context menu due to no app lifecycle');
            return;
        }
        this.app.unlinkSelection(text);
    }
}
