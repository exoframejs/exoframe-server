// npm packages

// our packages
import docker from './docker';
import logger from '../logger';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/clean', checkAuth, async (req, res) => {
    logger.info('cleaning docker..');
    // get all images
    const allImages = await docker.listImagesAsync();
    const imagesWithoutTags = allImages.filter(img => img.RepoTags.every(tag => tag.includes('<none>')));
    logger.debug('got images without tags:', imagesWithoutTags);
    await Promise.all(imagesWithoutTags.map(img => {
      const image = docker.getImage(img.Id);
      return image.removeAsync();
    }));
    logger.debug('removed all non-tagged images!');
    res.sendStatus(204);
  });
};
