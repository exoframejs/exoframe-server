const chokidar = require('chokidar');
const path = require('path');

const logger = require('../logger');
const {faasFolder} = require('../config');

const paths = {};

exports.listFunctions = () => {};

exports.setup = (fastify, opts, next) => {
  const watcher = chokidar.watch(faasFolder, {
    cwd: faasFolder,
    depth: 1,
  });
  watcher
    .on('addDir', folder => {
      // ignore empty current folder reference
      if (!folder || !folder.trim().length) {
        return;
      }
      const funPath = path.join(faasFolder, folder);
      const funConfigPath = path.join(funPath, 'exoframe.json');
      logger.debug(`Directory ${funPath} has been added`);
      const fun = require(funPath);
      const funConfig = require(funConfigPath);
      logger.debug(fun);
      paths[fun.path] = {
        fun,
        config: funConfig,
      };
    })
    .on('unlinkDir', path => logger.debug(`Directory ${path} has been removed`));

  fastify.route({
    method: 'GET',
    path: '*',
    async handler(request, reply) {
      const route = request.params['*'];
      logger.debug('faas getting route:', route);
      if (paths[route]) {
        const res = await paths[route].fun.handler();
        reply.send(res);
        return;
      }

      reply.code(404).send(`Error! Function not found!`);
    },
  });

  next();
};
