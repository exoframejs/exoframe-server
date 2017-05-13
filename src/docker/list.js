// npm modules

// our modules
const logger = require('../logger');
const docker = require('./docker');

module.exports = server => {
  server.route({
    method: 'GET',
    path: '/list',
    config: {
      auth: 'token',
    },
    async handler(request, reply) {
      // get username
      const {username} = request.auth.credentials;

      const allContainers = await docker.listContainers();
      const userContainers = allContainers
        .filter(c => c.Labels['exoframe.user'] === username)
        .filter(c => !c.Names.find(n => n === '/exoframe-traefik')); // filter out traefik

      reply(userContainers);
    },
  });
};
