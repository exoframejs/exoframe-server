// npm modules

// our modules
const logger = require('../logger');
const {hasCompose, updateCompose, executeCompose} = require('./dockercompose');
const generateDockerfile = require('./dockerfile');
const build = require('./build');
const start = require('./start');
const {cleanTemp, unpack} = require('./util');

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

        reply({status: 'success', name: 'ok'});
        return;
      }

      // generate dockerfile
      generateDockerfile();

      // build docker image
      const buildRes = await build({username});
      logger.debug('build result:', buildRes);

      // start image
      const container = await start(Object.assign(buildRes, {username}));
      logger.debug(container.Name);

      // clean temp folder
      await cleanTemp();

      reply({status: 'success', name: container.Name.substring(1)});
    },
  });
};
