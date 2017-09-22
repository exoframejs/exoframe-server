// npm modules
const _ = require('highland');
const {Readable} = require('stream');

// our modules
const logger = require('../logger');
const {hasCompose, updateCompose, executeCompose} = require('../docker/dockercompose');
const generateDockerfile = require('../docker/dockerfile');
const build = require('../docker/build');
const start = require('../docker/start');
const {sleep, cleanTemp, unpack, getProjectConfig, projectFromConfig, writeStatus} = require('../util');
const docker = require('../docker/docker');
const {removeContainer} = require('../docker/util');

// time to wait before removing old projects on update
const WAIT_TIME = 5000;

// deployment from unpacked files
const deploy = async ({username, resultStream}) => {
  // check if it's a docker-compose project
  if (hasCompose()) {
    // if it does - run compose workflow
    logger.debug('Docker-compose file found, executing compose workflow..');
    writeStatus(resultStream, {message: 'Deploying docker-compose project..', level: 'info'});

    // update compose file with project params
    const composeConfig = updateCompose({username});
    logger.debug('Compose modified:', composeConfig);
    writeStatus(resultStream, {message: 'Compose file modified', data: composeConfig, level: 'verbose'});

    // execute compose
    const exitCode = await executeCompose(resultStream);
    logger.debug('Compose executed, exit code:', exitCode);

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
    writeStatus(resultStream, {message: 'Deployment success!', deployments, level: 'info'});
    resultStream.end('');
    return;
  }

  // generate dockerfile
  generateDockerfile(resultStream);

  // build docker image
  try {
    const buildRes = await build({username, resultStream});
    logger.debug('Build result:', buildRes);

    // check for errors in build log
    if (
      buildRes.log
        .map(it => it.toLowerCase())
        .some(it => it.includes('error') || (it.includes('failed') && !it.includes('optional')))
    ) {
      logger.debug('Build log conains error!');
      writeStatus(resultStream, {message: 'Build log contains errors!', level: 'error'});
      resultStream.end('');
      return;
    }

    // start image
    const containerInfo = await start(Object.assign({}, buildRes, {username, resultStream}));
    logger.debug(containerInfo.Name);

    // clean temp folder
    await cleanTemp();

    const containerData = docker.getContainer(containerInfo.Id);
    const container = await containerData.inspect();
    // return new deployments
    writeStatus(resultStream, {message: 'Deployment success!', deployments: [container], level: 'info'});
    resultStream.end('');
  } catch (e) {
    logger.debug('build failed!', e);
    writeStatus(resultStream, {message: e.error, error: e.error, log: e.log, level: 'error'});
    resultStream.end('');
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
      // create new highland stream for results
      const resultStream = _();
      // run deploy
      deploy({username, resultStream});
      // reply with deploy stream
      reply(new Readable().wrap(resultStream)).code(200);
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

      // create new highland stream for results
      const resultStream = _();
      // deploy new versions
      deploy({username, payload: request.payload, resultStream});
      // reply with deploy stream
      reply(new Readable().wrap(resultStream)).code(200);
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
    },
  });
};
