// npm packages
const Hapi = require('hapi');

// our packages
const setupAuth = require('./auth');
const logger = require('./logger');

// create server
const server = new Hapi.Server();

// setup connection
server.connection({port: 8080, host: '0.0.0.0'});

// setup auth
setupAuth(server);

// export start function
module.exports = () => {
  server.start(err => {
    if (err) {
      throw err;
    }

    logger.info(`Server running at: ${server.info.uri}`);
  });
};
