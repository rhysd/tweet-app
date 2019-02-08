#! /usr/bin/env node

const child_process = require('child_process');
const electron = require('electron');
const join = require('path').join;

const argv = [join(__dirname, '..')];

child_process.spawn(electron, argv, {
    stdio: 'inherit',
});
