// npm packages
const initFastify = require('fastify');
const fastifyAuth = require('fastify-auth');
const cors = require('cors');

// our packages
const logger = require('./logger');

// init docker service
const {initDocker} = require('./docker/init');

// config
const {getConfig, waitForConfig} = require('./config');

// paths
const setupAuth = require('./auth');
const routes = require('./routes');

exports.startServer = async (port = 8080) => {
  // create server
  const fastify = initFastify().register(fastifyAuth);

  // enable cors if needed
  await waitForConfig();
  const config = getConfig();
  if (config.cors) {
    logger.warn('cors is enabled with config:', config.cors);
    // if it's just true - simply enable it
    if (typeof config.cors === 'boolean') {
      fastify.use(cors());
    } else {
      // otherwise pass config object to cors
      fastify.use(cors(config.cors));
    }
  }

  // add custom parser that just passes stream on
  fastify.addContentTypeParser('*', (req, done) => done());

  // register plugins
  await setupAuth(fastify)
    .register(routes)
    .ready();

  // start server
  await fastify.listen(port);
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
