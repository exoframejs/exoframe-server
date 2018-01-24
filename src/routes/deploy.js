/* eslint no-await-in-loop: off */
// npm modules
const _ = require('highland');
const {Readable} = require('stream');

// our modules
const logger = require('../logger');
const util = require('../util');
const docker = require('../docker/docker');
const build = require('../docker/build');
const start = require('../docker/start');
const getTemplates = require('../docker/templates');
const {removeContainer} = require('../docker/util');

// destruct locally used functions
const {sleep, cleanTemp, unpack, getProjectConfig, projectFromConfig, tempDockerDir} = util;

// time to wait before removing old projects on update
const WAIT_TIME = 5000;

// deployment from unpacked files
const deploy = async ({username, resultStream}) => {
  let template;
  // try getting template from config
  const config = getProjectConfig();

  // generate template props
  const templateProps = {
    config,
    username,
    resultStream,
    tempDockerDir,
    docker: {
      daemon: docker,
      build,
      start,
    },
    util: Object.assign({}, util, {
      logger,
    }),
  };

  // get templates
  const templates = getTemplates();

  // match via config if possible
  if (config.template && config.template.length > 0) {
    logger.debug('Looking up template from config:', config.template);
    template = templates.find(t => t.name === config.template);
  } else {
    // find template using check logic
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const isRightTemplate = await t.checkTemplate(templateProps);
      if (isRightTemplate) {
        template = t;
        break;
      }
    }
  }
  logger.debug('Using template:', template);
  // execute fitting template
  await template.executeTemplate(templateProps);
};

module.exports = fastify => {
  fastify.route({
    method: 'POST',
    path: '/deploy',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      // clean temp folder
      await cleanTemp();
      // get stream
      const tarStream = request.req;
      // unpack to temp folder
      await unpack(tarStream);
      // create new highland stream for results
      const resultStream = _();
      // run deploy
      deploy({username, resultStream});
      // reply with deploy stream
      reply.code(200).send(new Readable().wrap(resultStream));
    },
  });

  fastify.route({
    method: 'POST',
    path: '/update',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      // clean temp folder
      await cleanTemp();
      // get stream
      const tarStream = request.req;
      // unpack to temp folder
      await unpack(tarStream);
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
      // schedule cleanup
      process.nextTick(async () => {
        // wait a bit for it to start
        await sleep(WAIT_TIME);

        // remove old containers
        await Promise.all(existingContainers.map(removeContainer));
      });
      // reply with deploy stream
      reply.code(200).send(new Readable().wrap(resultStream));
    },
  });
};
