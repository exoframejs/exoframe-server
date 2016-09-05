// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.get('/api/pull', checkAuth, async (req, res) => {
    const {image} = req.query;
    let imageName = image;
    // determine if we need to provide :latest version tag
    const parts = image.split(':');
    if (parts.length === 1) {
      imageName = `${image}:latest`;
    }
    // log
    logger.info('pulling image:', imageName);
    const output = await docker.pullAsync(imageName);
    output.pipe(res);
  });
};
