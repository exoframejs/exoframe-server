// npm packages
import _ from 'lodash';
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
    const images = allImages.filter(img =>
      (img.RepoDigests && img.RepoDigests.length > 0) ||
      (img.Labels && img.Labels['exoframe.user'] === req.userInfo.username)
    );
    logger.debug('Got user and public images:', images);

    // get required services
    const services = reqServices.map(service => {
      const parts = service.name.split(':');
      const name = parts.length === 1 ? `${service.name}:latest` : service.name;
      const image = images.find(svc => svc.RepoTags[0].includes(name));
      return {
        ...service,
        image,
      };
    })
    .filter(service => service.image !== undefined);
    logger.debug('Got services:', services);

    if (services.length === 0) {
      res.status(400).send('Could not find specified images!');
      return;
    }

    // create containers
    const containers = await Promise.all(services.map(svc => {
      const cfg = {
        Image: `${svc.image.RepoTags[0]}`,
        name: `exo-${_.kebabCase(svc.name)}-${deployLabel}`,
        Labels: {
          'exoframe.deployment': `ex-pipeline-${deployLabel}`,
        },
      };

      if (!svc.image.Labels['exoframe.user']) {
        cfg.Labels['exoframe.user'] = req.userInfo.username;
      }
      if (!svc.image.Labels['exoframe.type']) {
        cfg.Labels['exoframe.type'] = 'registry image';
      }

      if (svc.env) {
        cfg.Env = svc.env;
      }

      if (svc.labels) {
        svc.labels.forEach(l => {
          cfg.Labels[l.key] = l.value;
        });
      }

      if (svc.ports) {
        const PortBindings = {};
        const ExposedPorts = {};
        // convert to port config
        svc.ports.forEach(p => {
          const pair = p.toString().split(':');
          const internal = pair[0];
          const external = pair[1] || pair[0];
          ExposedPorts[internal] = {};
          PortBindings[internal] = [{HostPort: external}];
        });
        // assign
        cfg.ExposedPorts = ExposedPorts;
        cfg.HostConfig = {PortBindings};
      }

      if (svc.restart && svc.restart.name) {
        if (!cfg.HostConfig) {
          cfg.HostConfig = {};
        }

        cfg.HostConfig.RestartPolicy = {Name: svc.restart.name};
        if (svc.restart.retries) {
          cfg.HostConfig.RestartPolicy.MaximumRetryCount = svc.restart.retries;
        }
      }

      if (svc.volumes) {
        cfg.Volumes = {};
        svc.volumes.forEach(v => {
          const [host] = v.split(':');
          cfg.Volumes[host] = {};
        });

        if (!cfg.HostConfig) {
          cfg.HostConfig = {};
        }

        cfg.HostConfig.Binds = svc.volumes;
      }

      logger.debug('Starting service with config:', cfg);
      return docker.createContainerAsync(cfg);
    }));
    // start containers
    await Promise.all(containers.map(container => container.startAsync()));

    res.send(containers);
  });
};
