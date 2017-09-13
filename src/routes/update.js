// our modules
const logger = require('../logger');
const docker = require('../docker/docker');
const {pullImage, initDocker, traefikName} = require('../docker/init');

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
          c => c.Image === 'traefik:latest' && c.Names.find(n => n === `/${traefikName}`)
        );

        const pullLog = await pullImage('traefik:latest');
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

      // default reply
      reply({updated: false, error: 'Wat'}).code(204);
    },
  });
};
