// npm packages
import os from 'os';
import path from 'path';
import Datastore from 'nedb';
import Bluebird from 'bluebird';

// create path to db folder
const baseFolder = path.join(os.homedir(), '.exoframe', 'db');
const dbConfig = {autoload: true};

// create new Users db
// only use file if we're not testing
const usersConfig = process.env.NODE_ENV === 'testing' ? dbConfig : {
  filename: path.join(baseFolder, 'users.json'),
  ...dbConfig,
};
// export new promisified db
export const User = Bluebird.promisifyAll(new Datastore(usersConfig));
