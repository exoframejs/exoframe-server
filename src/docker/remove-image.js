// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';
import {asyncRequest} from '../util';

export default (app) => {
  app.post('/api/image/remove/:id', checkAuth, asyncRequest(async (req, res) => {
    const {id} = req.params;
    logger.info('removing image:', id);
    const image = docker.getImage(id);
    const data = await image.removeAsync();
    logger.debug('removed image:', id, data);
    res.sendStatus(204);
  }));
};
