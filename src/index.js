// npm packages
const util = require('util');
const initFastify = require('fastify');
const fastifyAuth = require('fastify-auth');

// our packages
const logger = require('./logger');

// init docker service
const {initDocker} = require('./docker/init');

// paths
const setupAuth = require('./auth');
const routes = require('./routes');

exports.startServer = async (port = 8080) => {
  // create server
  const fastify = initFastify().register(fastifyAuth);

  // add custom parser that just passes stream on
  fastify.addContentTypeParser('*', (req, done) => done());

  // register plugins
  const after = util.promisify(setupAuth(fastify).register(routes).after);
  await after();

  // start server
  const fastifyListen = util.promisify(fastify.listen);
  await fastifyListen(port);
  logger.info(`Server running at: ${fastify.server.address().port}`);

  return fastify;
};

// export start function
exports.start = async () => {
  // init required docker service
  await initDocker();

  // init and return server
  return exports.startServer();
};
