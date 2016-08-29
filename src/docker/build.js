// npm packages

// our packages
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/build', checkAuth, async (req, res) => {
    const {tag} = req.query;
    const output = await docker.buildImageAsync(req, {t: tag});
    output.pipe(res);
  });
};
