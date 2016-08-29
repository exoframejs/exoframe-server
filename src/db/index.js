import os from 'os';
import path from 'path';
import Datastore from 'nedb-promise';

// construct paths
const baseFolder = path.join(os.homedir(), '.exoframe', 'db');
const usersDbPath = path.join(baseFolder, 'users.json');

export const users = new Datastore({filename: usersDbPath, autoload: true});
