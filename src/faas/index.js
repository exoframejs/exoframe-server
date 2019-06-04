const chokidar = require('chokidar');
const path = require('path');
const rimraf = require('rimraf');

const logger = require('../logger');
const {functionToContainerFormat} = require('../util');
const {faasFolder} = require('../config');
const runInWorker = require('./worker');

// loaded functions storage
const functions = {};

// remove function
const rmDir = path => new Promise(resolve => rimraf(path, resolve));

exports.listFunctions = () =>
  Object.keys(functions).map(route =>
    functionToContainerFormat({config: functions[route].config, route, type: functions[route].type})
  );

exports.removeFunction = async ({id, username}) => {
  logger.debug('Removing function:', id, username);
  const route = Object.keys(functions).find(route => functions[route].config.name === id);
  const fn = functions[route];
  logger.debug('Function found:', route, fn);
  if (!fn) {
    logger.debug('Function not found');
    return false;
  }

  // if running in worker - trigger cleanup
  if (fn.type === 'worker') {
    fn.worker.terminate();
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

    // we're done if it's http function
    if (config.type === 'http') {
      return;
    }

    // otherwise - execute work based on function
    if (config.type === 'worker') {
      const worker = runInWorker(functions[config.route]);
      functions[config.route].worker = worker;
      return;
    }

    logger.error('Unknown function type!', functions[config.route]);
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
