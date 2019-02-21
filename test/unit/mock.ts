import * as path from 'path';
import sinon = require('sinon');
import mock = require('mock-require');
import merge = require('lodash.merge');

export const appDir = path.join(__dirname, 'appDir');

const electron: any = {};

export function reset() {
    merge(electron, {
        app: {
            getPath: sinon.fake.returns(appDir),
        },
        shell: {
            openItem: sinon.fake(),
        },
        ipcMain: {
            on: sinon.fake(),
            removeListener: sinon.fake(),
        },
    });
}
reset();

mock('electron', electron);
