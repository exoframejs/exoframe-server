import {User} from '../db';
import logger from '../logger';
import {hash, asyncRequest} from '../util';

export default (app) => {
  app.post('/api/register', asyncRequest(async (req, res) => {
    const {username, password: plainPass, email} = req.body;
    const password = hash(plainPass);
    logger.info('adding new user:', {username, password, email});
    // check if email already used
    const existingUser = await User.findOneAsync({email});
    logger.debug('checked email:', existingUser);
    if (existingUser) {
      logger.debug('Email already used!');
      res.status(400).json({error: 'User with given email already exists!'});
      return;
    }
    // check if username already used
    const existingUsername = await User.findOneAsync({username});
    logger.debug('checked username:', existingUsername);
    if (existingUsername) {
      logger.debug('Username already used!');
      res.status(403).json({error: 'User with given username already exists!'});
      return;
    }

    // find user
    const user = await User.insertAsync({
      username,
      password,
      email,
    });

    if (!user) {
      logger.error('unknown error while creating user during registration!');
      res.status(500).json({error: 'Error while creating user!'});
      return;
    }

    logger.info('created user: ', user);
    res.status(201).send({message: 'User created! You can log in now.'});
  }));
};
