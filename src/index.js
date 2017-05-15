// npm packages
const Hapi = require('hapi');

// our packages
const logger = require('./logger');

// init docker service
const initDocker = require('./docker/init');

// paths
const setupAuth = require('./auth');
const setupRoutes = require('./routes');

// create server
const server = new Hapi.Server();

// setup connection
server.connection({port: 8080, host: '0.0.0.0'});

const setupServer = async () => {
  // setup auth
  const authServer = await setupAuth(server);
  // setup routes with auth
  setupRoutes(authServer);

  return server;
};

// export server for testing
exports.setupServer = setupServer;

// export start function
exports.start = async () => {
  // init required docker service
  await initDocker();

  // setup server
  await setupServer();

  // start server
  await server.start();
  logger.info(`Server running at: ${server.info.uri}`);
};
