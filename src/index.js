// npm packages
const Hapi = require('hapi');

// our packages
const logger = require('./logger');

// init docker service
const initDocker = require('./docker/init');

// paths
const setupAuth = require('./auth');
const setupDocker = require('./docker');

// create server
const server = new Hapi.Server();

// setup connection
server.connection({port: 8080, host: '0.0.0.0'});

// export start function
module.exports = async () => {
  // init required docker service
  await initDocker();

  // setup auth
  const authServer = await setupAuth(server);
  // setup docker routes with auth
  setupDocker(authServer);

  // start server
  await server.start();
  logger.info(`Server running at: ${server.info.uri}`);
};
