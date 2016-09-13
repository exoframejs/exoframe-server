// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/start/:id', checkAuth, async (req, res) => {
    const {id} = req.params;
    logger.info('starting:', id);
    const container = docker.getContainer(id);
    const data = await container.startAsync();
    logger.debug('started:', data);
    res.sendStatus(204);
  });
};
