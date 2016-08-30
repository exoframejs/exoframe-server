// npm packages
import uuid from 'node-uuid';

// our packages
import logger from '../logger';
import docker from './docker';
import {checkAuth} from '../auth/chechAuth';

export default (app) => {
  app.post('/api/deploy', checkAuth, async (req, res) => {
    logger.debug(req.body);
    const {deployId, services: reqServices} = req.body;
    const deployLabel = deployId || uuid.v1();
    if (!reqServices || !reqServices.length) {
      res.sendStatus(400);
      return;
    }

    // get existing user images
    const allImages = await docker.listImagesAsync();
    const images = allImages.filter(img => img.Labels && img.Labels['exoframe.user'] === req.userInfo.username);
    logger.debug('Got user images:', images);

    // get required services
    const services = reqServices.map(service => {
      const image = images.find(svc => svc.RepoTags[0].indexOf(service.name) !== -1);
      return {
        ...service,
        image,
      };
    });
    logger.debug('Got services:', services);

    // create containers
    const containers = await Promise.all(services.map(svc => {
      const cfg = {
        Image: `${svc.image.RepoTags[0]}`,
        name: `exo-${svc.name}-${deployLabel}`,
        Labels: {
          'exoframe.deployment': `ex-pipeline-${deployLabel}`,
        },
      };

      if (svc.env) {
        cfg.Env = svc.env;
      }

      if (svc.ports) {
        const PortBindings = {};
        // convert to port config
        svc.ports.forEach(p => {
          const pair = p.toString().split(':');
          const internal = pair[0];
          const external = pair[1] || pair[0];
          PortBindings[internal] = [{HostPort: external}];
        });
        // assign
        cfg.HostConfig = {PortBindings};
      }

      logger.debug('Starting service with config:', cfg);
      return docker.createContainerAsync(cfg);
    }));
    // start containers
    await Promise.all(containers.map(container => container.startAsync()));

    res.send(containers);
  });
};
