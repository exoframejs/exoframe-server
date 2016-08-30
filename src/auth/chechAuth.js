// npm packages
import jwt from 'jsonwebtoken';

// our packages
import {auth as authConf} from '../../config';
import logger from '../logger';
import {users} from '../db';
import {asyncRequest} from '../util';

export const checkAuth = asyncRequest(async (req, res, next) => {
  const token = req.headers['x-access-token'];
  let decoded;
  try {
    decoded = jwt.verify(token, authConf.jwtSecret);
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(403).send({error: 'Token expired! Please re-login.'});
    }
    throw e;
  }
  logger.debug('decoded: ', decoded);
  const {username} = decoded;
  logger.debug('searching for: ', username);
  // find user
  const user = await users.findOne({username});
  if (user) {
    logger.debug('user found!', user);
    req.userInfo = user; // eslint-disable-line
    return next();
  }

  // otherwise - return 403
  return res.status(403).send({error: 'You are not logged in!'});
});
