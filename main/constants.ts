import * as path from 'path';
import { app } from 'electron';

export const IS_DEBUG = process.env.TWEET_APP_DEBUG !== undefined;
export const IS_DEV = process.env.NODE_ENV === 'development';
export const DATA_DIR = app.getPath('userData');
export const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
export const PRELOAD_JS = path.join(__dirname, '..', 'renderer', 'preload.js');