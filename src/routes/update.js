// our modules
const logger = require('../logger');
const docker = require('../docker/docker');
const {pullImage, initDocker, initNetwork, traefikName} = require('../docker/init');

// image names
const traefikImageName = 'traefik:latest';
const serverImageName = 'exoframe/server:latest';

module.exports = server => {
  server.route({
    method: 'POST',
    path: '/update/{target}',
    config: {
      auth: 'token',
    },
    async handler(request, reply) {
      // get username
      const {target} = request.params;

      // traefik update logic
      if (target === 'traefik') {
        // get all containers
        const allContainers = await docker.listContainers();
        // try to find traefik instance
        const oldTraefik = allContainers.find(
          c => c.Image === traefikImageName && c.Names.find(n => n === `/${traefikName}`)
        );

        const pullLog = await pullImage(traefikImageName);
        // check if already up to date
        if (pullLog.includes('Image is up to date')) {
          logger.debug('Traefik is already up to date!');
          reply({updated: false}).code(200);
          return;
        }
        // check if new image was pulled
        if (pullLog.includes('Downloaded newer image')) {
          logger.debug('Traefik image updated, restarting service..');
          // kill old traefik if needed
          if (oldTraefik && oldTraefik.Id) {
            const traefikContainer = docker.getContainer(oldTraefik.Id);
            await traefikContainer.stop();
            await traefikContainer.remove();
          }
          // re-init traefik
          initDocker({restart: true});
          // reply
          reply({updated: true}).code(200);
          return;
        }

        // otherwise report error with current log
        reply({updated: false, error: 'Error updating image', log: pullLog}).code(500);
        return;
      }

      // self update logic
      if (target === 'server') {
        // get all containers
        const allContainers = await docker.listContainers();
        // try to find traefik instance
        const oldServer = allContainers.find(
          c => c.Image === serverImageName && c.Names.find(n => n.startsWith('/exoframe-server'))
        );

        const pullLog = await pullImage(serverImageName);
        // check if already up to date
        if (pullLog.includes('Image is up to date')) {
          logger.debug('Exoframe server is already up to date!');
          reply({updated: false}).code(200);
          return;
        }
        // check if new image was pulled
        if (pullLog.includes('Downloaded newer image')) {
          logger.debug('Exoframe server image updated, restarting service..');
          // get old server info
          const serverContainer = docker.getContainer(oldServer.Id);
          const oldServerInfo = await serverContainer.inspect();
          // get image and its hash
          const allImages = await docker.listImages();
          const serverImage = allImages.find(img => img.RepoTags && img.RepoTags.includes(serverImageName));
          const hash = serverImage.Id
            .split(':')
            .pop()
            .substr(0, 12);
          // init config
          const config = {
            Image: serverImageName,
            name: `exoframe-server-${hash}`,
            Env: oldServerInfo.Config.Env,
            Labels: oldServerInfo.Config.Labels,
            HostConfig: {
              Binds: oldServerInfo.HostConfig.Binds,
            },
          };
          // start new self
          const container = await docker.createContainer(config);
          // get exoframe network
          const exoNet = await initNetwork();
          // connect traefik to exoframe net
          await exoNet.connect({
            Container: container.id,
          });
          // start container
          await container.start();
          // reply
          reply({updated: true}).code(200);
          // kill old self
          serverContainer.remove({force: true});
          return;
        }

        // otherwise report error with current log
        reply({updated: false, error: 'Error updating image', log: pullLog}).code(500);
        return;
      }

      // default reply
      reply({updated: false, error: 'Wat'}).code(204);
    },
  });
};
