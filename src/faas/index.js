const chokidar = require('chokidar');
const path = require('path');
const rimraf = require('rimraf');

const logger = require('../logger');
const {functionToContainerFormat} = require('../util');
const {faasFolder} = require('../config');

// loaded functions storage
const functions = {};

// remove function
const rmDir = path => new Promise(resolve => rimraf(path, resolve));

exports.listFunctions = () =>
  Object.keys(functions).map(route =>
    functionToContainerFormat({config: functions[route].config, route, type: functions[route].type})
  );

exports.removeFunction = async ({id, username}) => {
  console.log('removing:', id, username);
  const route = Object.keys(functions).find(route => functions[route].config.name === id);
  const fn = functions[route];
  console.log('fn found:', route, fn);
  if (!fn) {
    console.log('not found');
    return;
  }

  // remove from cache
  delete functions[route];
  // remove files
  await rmDir(fn.folder);

  return true;
};

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
    // construct paths
    const funPath = path.join(faasFolder, folder);
    const funConfigPath = path.join(funPath, 'exoframe.json');
    logger.debug(`Directory ${funPath} has been added`);
    // load code and config
    const fun = require(funPath);
    const funConfig = require(funConfigPath);
    // expand config into default values
    const config = {route: `/${funConfig.name}`, type: 'http', ...funConfig.function};
    // store function in memory
    functions[config.route] = {
      type: config.type,
      route: config.route,
      handler: fun,
      config: funConfig,
      folder: funPath,
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
