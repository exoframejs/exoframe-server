import {User} from '../db';
import logger from '../logger';
import {hash} from '../util';

export default {
  async authenticate({username, password: plainPass}) {
    const password = hash(plainPass);
    logger.info('basic auth - searching for: ', {username, password});
    // find user
    const user = await User.findOneAsync({username, password}, {password: 0});
    // check if user was found
    if (!user) {
      logger.error('Incorrect username or password:', username);
      return {error: 'Incorrect username or password!'};
    }

    return {user};
  },
};
