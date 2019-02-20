import * as path from 'path';
import * as A from 'assert';
import mock = require('mock-require');

export const appDir = path.join(__dirname, 'appDir');

const electron = {
    app: {
        getPath(kind: string) {
            A.strictEqual(kind, 'userData');
            return appDir;
        },
    },
    shell: {
        openItem(_path: string) {},
    },
};

mock('electron', electron);
