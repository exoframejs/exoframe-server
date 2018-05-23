// our modules
const docker = require('../docker/docker');
const {getConfig} = require('../config');

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/list',
    async handler(request, reply) {
      // get username
      const {username} = request.user;

      // get config
      const config = getConfig();

      const allContainers = await docker.listContainers({all: true});
      const userContainers = await Promise.all(
        allContainers
          .filter(c => c.Labels['exoframe.user'] === username) // get only user containers
          .filter(c => !c.Names.find(n => n === `/${config.traefikName}`)) // filter out traefik
          .map(c => docker.getContainer(c.Id))
          .map(c => c.inspect())
      );

      // if not running in swarm mode - just return results
      if (!config.swarm) {
        reply.send({containers: userContainers, services: []});
        return;
      }

      // get swarm services
      const allServices = await docker.listServices();
      const userServices = await Promise.all(
        allServices
          .filter(s => s.Spec.Labels['exoframe.user'] === username)
          .filter(s => s.Spec.Name !== config.traefikName)
          .map(s => docker.getService(s.ID))
          .map(s => s.inspect())
      );

      reply.send({containers: userContainers, services: userServices});
    },
  });
};
