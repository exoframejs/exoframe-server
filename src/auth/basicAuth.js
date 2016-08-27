import logger from '../logger';
import {getConfig} from '../config';

export default {
  async authenticate({username, password}) {
    const userConfig = getConfig();
    logger.info('basic auth - searching for: ', {username, password});
    logger.debug('using config:', userConfig);
    // find user
    const user = userConfig.users.find(u => u.username === username && u.password === password);
    logger.debug('user:', user);
    // check if user was found
    if (!user) {
      logger.error('Incorrect username or password:', username);
      return {error: 'Incorrect username or password!'};
    }

    // delete password field
    delete user.password;

    return {user};
  },
};
