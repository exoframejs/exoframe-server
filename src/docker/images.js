// npm packages

// our packages
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';
import logger from '../logger';

export default (app) => {
  app.get('/api/images', checkAuth, async (req, res) => {
    const {public: includePublic} = req.query;
    const allImages = await docker.listImagesAsync();
    logger.info('Getting images:', includePublic);
    const images = allImages.filter(img =>
      (includePublic && img.RepoDigests && img.RepoDigests.length > 0) ||
      (img.Labels && img.Labels['exoframe.user'] === req.userInfo.username)
    );
    logger.debug('Got images:', images);
    res.send(images);
  });
};
