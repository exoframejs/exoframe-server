// our modules
const docker = require('../docker/docker');

module.exports = server => {
  server.route({
    method: 'POST',
    path: '/remove/{id}',
    config: {
      auth: 'token',
    },
    async handler(request, reply) {
      // get username
      const {username} = request.auth.credentials;
      const {id} = request.params;

      const allContainers = await docker.listContainers();
      const containerInfo = allContainers.find(
        c => c.Labels['exoframe.user'] === username && c.Names.find(n => n === `/${id}`)
      );

      if (!containerInfo) {
        reply({error: 'Container not found!'}).code(404);
        return;
      }

      const service = docker.getContainer(containerInfo.Id);
      await service.stop();
      await service.remove();

      reply('removed').code(204);
    },
  });
};
