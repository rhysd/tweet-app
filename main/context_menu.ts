import { ContextMenuParams, MenuItemConstructorOptions } from 'electron';
import contextMenu = require('electron-context-menu');
import log from './log';
import Lifecycle from './lifecycle';

export default class ContextMenu {
    private app: Lifecycle | null = null;

    public constructor() {
        contextMenu({
            prepend: (_params, params, _window) => {
                log.debug('Context menu:', params);
                return [this.itemUnlink(params)];
            },
        });
    }

    public setLifecycle(l: Lifecycle) {
        this.app = l;
    }

    private itemUnlink(params: ContextMenuParams): MenuItemConstructorOptions {
        const sel = params.selectionText || '';
        const flags = params.editFlags;
        const visible = sel !== '' && params.isEditable && flags.canDelete && flags.canPaste;
        return {
            label: 'Unlink auto links',
            visible,
            click: this.unlink.bind(this, sel),
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
