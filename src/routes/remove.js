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

      const allContainers = await docker.listContainers({all: true});
      const containerInfo = allContainers.find(
        c => c.Labels['exoframe.user'] === username && c.Names.find(n => n === `/${id}`)
      );

      // if container found by name - remove
      if (containerInfo) {
        const service = docker.getContainer(containerInfo.Id);
        if (containerInfo.State === 'running') {
          await service.stop();
        }
        await service.remove();

        reply('removed').code(204);
        return;
      }

      // if not found by name - try to find by project
      const containers = allContainers.filter(
        c => c.Labels['exoframe.user'] === username && c.Labels['exoframe.project'] === id
      );
      if (!containers.length) {
        reply({error: 'Container not found!'}).code(404);
        return;
      }

      await Promise.all(
        containers.map(async cInfo => {
          const service = docker.getContainer(cInfo.Id);
          if (cInfo.State === 'running') {
            await service.stop();
          }
          await service.remove();
        })
      );

      reply('removed').code(204);
    },
  });
};
