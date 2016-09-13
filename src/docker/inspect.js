// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.get('/api/inspect/:id', checkAuth, async (req, res) => {
    const {id} = req.params;
    logger.info('inspecting:', id);
    const container = docker.getContainer(id);
    const inspect = await container.inspectAsync();
    res.send(inspect);
  });
};
