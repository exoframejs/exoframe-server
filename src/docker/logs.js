// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.get('/api/logs/:id', checkAuth, async (req, res) => {
    const {id} = req.params;
    logger.info('getting logs for:', id);
    const container = docker.getContainer(id);
    const logStream = await container.logsAsync({
      follow: true,
      stdout: true,
      stderr: true,
    });
    logStream.pipe(res);
  });
};
