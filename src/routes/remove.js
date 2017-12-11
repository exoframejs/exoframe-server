// our modules
const docker = require('../docker/docker');
const {removeContainer} = require('../docker/util');

module.exports = fastify => {
  fastify.route({
    method: 'POST',
    path: '/remove/:id',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      const {id} = request.params;

      const allContainers = await docker.listContainers({all: true});
      const containerInfo = allContainers.find(
        c => c.Labels['exoframe.user'] === username && c.Names.find(n => n === `/${id}`)
      );

      // if container found by name - remove
      if (containerInfo) {
        await removeContainer(containerInfo);
        reply.code(204).send('removed');
        return;
      }

      // if not found by name - try to find by project
      const containers = allContainers.filter(
        c => c.Labels['exoframe.user'] === username && c.Labels['exoframe.project'] === id
      );
      if (!containers.length) {
        reply.code(404).send({error: 'Container not found!'});
        return;
      }
      // remove all
      await Promise.all(containers.map(removeContainer));
      // reply
      reply.code(204).send('removed');
    },
  });
};
