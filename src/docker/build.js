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
    const labelsParsed = JSON.parse(labels);
    // assign current user info using label
    labelsParsed['exoframe.user'] = req.userInfo.username;
    logger.info('building image with:', {tag, labelsParsed});
    const output = await docker.buildImageAsync(req, {t: tag, labels: labelsParsed});
    output.pipe(res);
  }));
};
