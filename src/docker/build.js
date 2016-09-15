// npm packages

// our packages
import logger from '../logger';
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';
import {asyncRequest} from '../util';

export default (app) => {
  app.post('/api/build', checkAuth, asyncRequest(async (req, res) => {
    logger.info('building image');
    const {tag, labels} = req.query;

    // check if tag is present
    if (!tag) {
      res.status(400).json({error: 'No tag specified!'});
      return;
    }

    // parse labels
    let labelsParsed = {};
    try {
      labelsParsed = JSON.parse(labels);
    } catch (e) {
      logger.debug('Error parsing labels:', labels);
    }

    // assign current user info using label
    labelsParsed['exoframe.user'] = req.userInfo.username;

    // build image and pipe output to response
    logger.info('building image with:', {tag, labelsParsed});
    const output = await docker.buildImageAsync(req, {t: tag, labels: labelsParsed});
    output.pipe(res);
  }));
};
