// npm modules
const _ = require('highland');
const {Readable, PassThrough} = require('stream');

// our modules
const docker = require('../docker/docker');
const {getConfig} = require('../config');

const logsConfig = {
  follow: false,
  stdout: true,
  stderr: true,
  timestamps: true,
};

// fix for dockerode returning array of strings instead of log stream
const fixLogStream = logs => {
  if (typeof logs === 'string') {
    return _(logs.split('\n').map(l => `${l}\n`));
  }

  return logs;
};

const getContainerLogs = async ({username, id, reply}) => {
  const allContainers = await docker.listContainers({all: true});
  const containerInfo = allContainers.find(
    c => c.Labels['exoframe.user'] === username && c.Names.find(n => n === `/${id}`)
  );

  if (containerInfo) {
    const container = docker.getContainer(containerInfo.Id);
    const logs = await container.logs(logsConfig);
    const logStream = fixLogStream(logs);
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
      const logStream = fixLogStream(logs);
      const name = cInfo.Names[0].replace(/^\//, '');
      const nameStream = _([`Logs for ${name}\n\n`]);
      return [nameStream, _(logStream)];
    })
  );
  // flatten results
  const allLogsStream = _(logRequests).flatten();
  // send wrapped highland stream as response
  reply.send(new Readable().wrap(allLogsStream));
};

const getServiceLogs = async ({username, id, reply}) => {
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Labels['exoframe.user'] === username && c.Spec.Name === id);

  if (serviceInfo) {
    const service = docker.getService(serviceInfo.ID);
    const logs = await service.logs(logsConfig);
    const logStream = fixLogStream(logs);
    reply.send(logStream);
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

  // get all log streams and prepend them with service names
  const logRequests = await Promise.all(
    services.map(async cInfo => {
      const container = docker.getService(cInfo.ID);
      const logs = await container.logs(logsConfig);
      const logStream = fixLogStream(logs);
      const name = cInfo.Spec.Name;
      const nameStream = _([`Logs for ${name}\n\n`]);
      return [nameStream, _(logStream)];
    })
  );
  // flatten results
  const allLogsStream = _(logRequests).flatten();
  // send wrapped highland stream as response
  reply.send(new Readable().wrap(allLogsStream));
};

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/logs/:id',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      const {id} = request.params;

      // get server config
      const config = getConfig();
      // if running in swarm - get service logs
      if (config.swarm) {
        getServiceLogs({username, id, reply});
        return;
      }
      // otherwise - get container logs
      getContainerLogs({username, id, reply});
    },
  });
};
