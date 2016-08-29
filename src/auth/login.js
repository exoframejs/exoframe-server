// npm packages
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import moment from 'moment';

// our packages
import {users} from '../db';
import {auth as authConf} from '../../config';
import logger from '../logger';
import {asyncRequest} from '../util';
import basicAuth from './basicAuth';

export default (app) => {
  // TODO: allow extension
  const authStrategies = [basicAuth];

  app.post('/api/login', asyncRequest(async(req, res) => {
    const {username, remember, password} = req.body;
    logger.info('authenticating for: ', {username});

    let user = null;
    let error = null;

    // try to find in authed db
    user = await users.findOne({username, password});

    // if not found - use auth strategies
    if (!user) {
      for (let i = 0; i < authStrategies.length; i++) {
        const ex = authStrategies[i];
        const authRes = await ex.authenticate({username, password});
        user = authRes.user;
        error = authRes.error;
        if (user) {
          error = null;
          break;
        }
      }
    }
    // if ended with error - throw
    if (error) {
      res.status(401).json({error});
      return;
    }

    logger.info('got user: ', user);
    // save user to local db
    await users.insert(user);

    // generate JWT
    const userWithoutPass = _.omit(user, ['password']);
    const expireDays = remember ? 90 : 1;
    const expires = moment().add(expireDays, 'd').toDate();
    // generate token
    const token = jwt.sign(userWithoutPass, authConf.jwtSecret, {expiresIn: `${expireDays}d`});
    // expiration date
    logger.debug('expires:', expires);
    // send token
    res.status(200).json({token, user: userWithoutPass});
  }));
};
