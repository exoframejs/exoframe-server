// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/remove/:id', checkAuth, async (req, res) => {
    const {id} = req.params;
    logger.info('removing:', id);
    const container = docker.getContainer(id);
    const data = await container.removeAsync();
    logger.debug('removed:', id, data);
    res.sendStatus(204);
  });
};
