// our modules
const docker = require('../docker/docker');
const {removeContainer} = require('../docker/util');

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
        await removeContainer(containerInfo);
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
      // remove all
      await Promise.all(containers.map(removeContainer));
      // reply
      reply('removed').code(204);
    },
  });
};
