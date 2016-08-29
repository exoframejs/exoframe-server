// npm packages

// our packages
import docker from './docker';

export default (app) => {
  app.post('/api/build', async (req, res) => {
    const {tag} = req.query;
    const output = await docker.buildImageAsync(req, {t: tag});
    output.pipe(res);
  });
};
