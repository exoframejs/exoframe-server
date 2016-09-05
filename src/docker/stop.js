// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/stop/:id', checkAuth, async (req, res) => {
    const {id} = req.params;
    logger.info('stopping:', id);
    const container = docker.getContainer(id);
    const data = await container.stopAsync();
    logger.debug('stopped:', data);
    res.sendStatus(204);
  });
};
