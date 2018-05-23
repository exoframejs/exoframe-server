// our modules
const docker = require('../docker/docker');
const {removeContainer, removeService} = require('../docker/util');
const {getConfig} = require('../config');

// removal of normal containers
const removeUserContainer = async ({username, id, reply}) => {
  // look for normal containers
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
};

// removal of swarm services
const removeUserService = async ({username, id, reply}) => {
  // look for normal containers
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Labels['exoframe.user'] === username && c.Spec.Name === id);

  // if container found by name - remove
  if (serviceInfo) {
    await removeService(serviceInfo);
    reply.code(204).send('removed');
    return;
  }

  // if not found by name - try to find by project
  const services = allServices.filter(
    c => c.Spec.Labels['exoframe.user'] === username && c.Spec.Labels['exoframe.project'] === id
  );
  if (!services.length) {
    reply.code(404).send({error: 'Service not found!'});
    return;
  }
  // remove all
  await Promise.all(services.map(removeService));
  // reply
  reply.code(204).send('removed');
};

module.exports = fastify => {
  fastify.route({
    method: 'POST',
    path: '/remove/:id',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      const {id} = request.params;

      // get server config
      const config = getConfig();

      // if running in swarm - work with services
      if (config.swarm) {
        removeUserService({username, id, reply});
        return;
      }

      removeUserContainer({username, id, reply});
    },
  });
};
