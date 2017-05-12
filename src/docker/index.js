// npm modules

// our modules
const logger = require('../logger');
const generateDockerfile = require('./dockerfile');
const build = require('./build');
const start = require('./start');
const {unpack} = require('./util');

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

      // unpack to temp folder
      await unpack(request.payload.path);

      // generate dockerfile
      generateDockerfile();

      // build docker image
      const buildRes = await build({username});
      logger.debug('build result:', buildRes);

      // start image
      const container = await start(Object.assign(buildRes, {username}));
      logger.debug(container);

      reply({status: 'success', name: container.Name.substring(1)});
    },
  });
};
