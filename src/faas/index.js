const chokidar = require('chokidar');
const path = require('path');

const logger = require('../logger');
const {functionToContainerFormat} = require('../util');
const {faasFolder} = require('../config');

const functions = {};

exports.listFunctions = () =>
  Object.keys(functions).map(route =>
    functionToContainerFormat({config: functions[route].config, route, type: functions[route].type})
  );

exports.setup = (fastify, opts, next) => {
  const watcher = chokidar.watch(faasFolder, {
    cwd: faasFolder,
    depth: 1,
  });
  watcher.on('addDir', folder => {
    // ignore empty current folder reference
    if (!folder || !folder.trim().length) {
      return;
    }
    const funPath = path.join(faasFolder, folder);
    const funConfigPath = path.join(funPath, 'exoframe.json');
    logger.debug(`Directory ${funPath} has been added`);
    const fun = require(funPath);
    const funConfig = require(funConfigPath);
    const funRoute = fun.path || `/${funConfig.name}`;
    logger.debug(fun);
    functions[funRoute] = {
      type: 'http',
      route: funRoute,
      ...fun,
      config: funConfig,
    };
  });

  // http handler
  fastify.route({
    method: 'GET',
    path: '*',
    async handler(request, reply) {
      const route = request.params['*'];
      logger.debug('faas getting route:', route);
      if (functions[route] && functions[route].type === 'http') {
        const event = request;
        const context = reply;
        const res = await functions[route].handler(event, context);
        if (res) {
          reply.send(res);
        }
        return;
      }

      reply.code(404).send(`Error! Function not found!`);
    },
  });

  next();
};
