export default {
  async authenticate({username, password, config, logger}) {
    logger.info('basic auth - searching for: ', {username, password});
    logger.debug('using config:', config);
    // find user
    const user = config.users.find(u => u.username === username && u.password === password);
    logger.debug('user:', user);
    // check if user was found
    if (!user) {
      logger.error('Incorrect username or password:', username);
      return {error: 'Incorrect username or password!'};
    }
    // return user without password
    return {user};
  },
};
