// npm packages

// our packages
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/build', checkAuth, async (req, res) => {
    const {tag, labels} = req.query;
    const labelsParsed = JSON.parse(labels);
    const output = await docker.buildImageAsync(req, {t: tag, labels: labelsParsed});
    output.pipe(res);
  });
};
