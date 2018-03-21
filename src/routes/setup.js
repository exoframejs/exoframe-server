/* eslint global-require: off */
/* eslint import/no-dynamic-require: off */
// npm packages
const path = require('path');

// our modules
const logger = require('../logger');
const {getConfig, recipesFolder, tempDockerDir} = require('../config');
const {pullImage} = require('../docker/init');
const docker = require('../docker/docker');
const build = require('../docker/build');
const {start, startFromParams} = require('../docker/start');
const {initNetwork: getNetwork, createNetwork} = require('../docker/network');
const util = require('../util');

module.exports = fastify => {
  fastify.route({
    method: 'GET',
    path: '/setup',
    async handler(request, reply) {
      const {recipeName} = request.query;
      logger.debug('setting up:', recipeName);
      // install recipe
      const log = await util.runYarn({args: ['add', '--verbose', recipeName], cwd: recipesFolder});
      const success = !log.find(it => it.level === 'error');
      // if log contains errors - just terminate now
      if (!success) {
        reply.send({success, log});
        return;
      }
      // get installed recipe path
      const recipePath = path.join(recipesFolder, 'node_modules', recipeName);
      // load recipe
      const recipe = require(recipePath);
      // get questions
      const questions = recipe.getQuestions();
      reply.send({success, log, questions});
    },
  });

  fastify.route({
    method: 'POST',
    path: '/setup',
    async handler(request, reply) {
      // get username
      const {username} = request.user;
      // get server config
      const serverConfig = getConfig();
      // get user vars
      const {recipeName, answers} = request.body;
      logger.debug('executing recipe:', recipeName);
      // get installed recipe path
      const recipePath = path.join(recipesFolder, 'node_modules', recipeName);
      // clear require cache
      delete require.cache[require.resolve(recipePath)];
      // load recipe
      const recipe = require(recipePath);
      // generate recipe props
      const recipeProps = {
        // user answers
        answers,
        // our vars
        serverConfig,
        username,
        tempDockerDir,
        docker: {
          daemon: docker,
          build,
          start,
          startFromParams,
          pullImage,
          getNetwork,
          createNetwork,
        },
        util: Object.assign({}, util, {
          logger,
        }),
      };
      // wait for recipe execution
      try {
        const log = await recipe.runSetup(recipeProps);
        const success = !log.find(it => it.level === 'error');
        reply.send({success, log});
      } catch (e) {
        reply.send({success: false, log: [{message: e.toString(), level: 'error'}]});
      }
    },
  });
};
