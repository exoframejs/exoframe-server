// npm modules

// our modules
const logger = require('../logger');
const {hasCompose, updateCompose, executeCompose} = require('../docker/dockercompose');
const generateDockerfile = require('../docker/dockerfile');
const build = require('../docker/build');
const start = require('../docker/start');
const {sleep, cleanTemp, unpack, getProjectConfig, projectFromConfig} = require('../util');
const docker = require('../docker/docker');
const {removeContainer} = require('../docker/util');

// time to wait before removing old projects on update
const WAIT_TIME = 5000;

// deployment from unpacked files
const deploy = async ({username}) => {
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
    return [{status: 'success', deployments}, 200];
  }

  // generate dockerfile
  generateDockerfile();

  // build docker image
  try {
    const buildRes = await build({username});
    logger.debug('build result:', buildRes);

    // check for errors in build log
    if (buildRes.log.map(it => it.toLowerCase()).some(it => it.includes('error') || it.includes('failed'))) {
      logger.debug('build log conains error!');
      return [{status: 'error', result: buildRes}, 400];
    }

    // start image
    const containerInfo = await start(Object.assign(buildRes, {username}));
    logger.debug(containerInfo.Name);

    // clean temp folder
    await cleanTemp();

    const containerData = docker.getContainer(containerInfo.Id);
    const container = await containerData.inspect();
    return [{status: 'success', deployments: [container]}, 200];
  } catch (e) {
    logger.debug('build failed!', e);
    return [{status: 'error', result: e}, 400];
  }
};

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
      // run deploy
      const [response, code] = await deploy({username});
      // respond
      reply(response).code(code);
    },
  });

  server.route({
    method: 'POST',
    path: '/update',
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

      // get old project containers if present
      // get project config and name
      const config = getProjectConfig();
      const project = projectFromConfig({username, config});
      // get all current containers
      const oldContainers = await docker.listContainers({all: true});
      // find containers for current user and project
      const existingContainers = oldContainers.filter(
        c => c.Labels['exoframe.user'] === username && c.Labels['exoframe.project'] === project
      );

      // deploy new versions
      // run deploy
      const [response, code] = await deploy({username, payload: request.payload});
      // wait a bit for it to start
      await sleep(WAIT_TIME);

      // remove old containers
      try {
        await Promise.all(existingContainers.map(removeContainer));
      } catch (e) {
        // ignore not found errors
        if (!e.toString().includes('no such container')) {
          logger.error('Error removing old deployment:', e);
        }
      }

      // respond
      reply(response).code(code);
    },
  });
};
