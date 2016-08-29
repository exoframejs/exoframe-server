// npm packages

// our packages
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.get('/api/list', checkAuth, async (req, res) => {
    const allImages = await docker.listImagesAsync();
    const images = allImages.filter(img => img.Labels && img.Labels['exoframe.user'] === req.userInfo.username);
    res.send(images);
  });
};
