// npm modules

// our modules
const logger = require('../logger');
const {hasCompose, updateCompose, executeCompose} = require('../docker/dockercompose');
const generateDockerfile = require('../docker/dockerfile');
const build = require('../docker/build');
const start = require('../docker/start');
const {cleanTemp, unpack} = require('../util');
const docker = require('../docker/docker');

module.exports = server => {
  server.route({
    method: 'POST',
    path: '/deploy',
    config: {
      auth: 'token',
      payload: {
        output: 'file',
        parse: true,
      },
    },
    async handler(request, reply) {
      // get username
      const {username} = request.auth.credentials;

      // clean temp folder
      await cleanTemp();

      // unpack to temp folder
      await unpack(request.payload.path);

      // check if it's a docker-compose project
      if (hasCompose()) {
        // if it does - run compose workflow
        logger.debug('Docker-compose file found, executing compose workflow..');

        // update compose file with project params
        const composeConfig = updateCompose({username});
        logger.debug('Compose modified:', composeConfig);

        // execute compose
        const {log} = await executeCompose();
        logger.debug('Compose executed:', log);

        // get container infos
        const allContainers = await docker.listContainers({all: true});
        const deployments = await Promise.all(
          Object.keys(composeConfig.services)
            .map(svc => composeConfig.services[svc].container_name)
            .map(name => allContainers.find(c => c.Names.find(n => n === `/${name}`)))
            .map(info => docker.getContainer(info.Id))
            .map(container => container.inspect())
        );
        // return them
        reply({status: 'success', deployments});
        return;
      }

      // generate dockerfile
      generateDockerfile();

      // build docker image
      const buildRes = await build({username});
      logger.debug('build result:', buildRes);

      // start image
      const containerInfo = await start(Object.assign(buildRes, {username}));
      logger.debug(containerInfo.Name);

      // clean temp folder
      await cleanTemp();

      const containerData = docker.getContainer(containerInfo.Id);
      const container = await containerData.inspect();
      reply({status: 'success', deployments: [container]});
    },
  });
};
