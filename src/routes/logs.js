// our modules
const _ = require('highland');
const {Readable} = require('stream');
const docker = require('../docker/docker');

const logsConfig = {
  follow: false,
  stdout: true,
  stderr: true,
  timestamps: true,
};

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/logs/:id',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      const {id} = request.params;

      const allContainers = await docker.listContainers({all: true});
      const containerInfo = allContainers.find(
        c => c.Labels['exoframe.user'] === username && c.Names.find(n => n === `/${id}`)
      );

      if (containerInfo) {
        const container = docker.getContainer(containerInfo.Id);
        const logStream = await container.logs(logsConfig);
        reply.send(logStream);
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

      // get all log streams and prepend them with service names
      const logRequests = await Promise.all(
        containers.map(async cInfo => {
          const container = docker.getContainer(cInfo.Id);
          const logs = await container.logs(logsConfig);
          const name = cInfo.Names[0].replace(/^\//, '');
          const nameStream = _([`Logs for ${name}\n\n`]);
          return [nameStream, _(logs)];
        })
      );
      // flatten results
      const allLogsStream = _(logRequests).flatten();
      // send wrapped highland stream as response
      reply.send(new Readable().wrap(allLogsStream));
    },
  });
};
