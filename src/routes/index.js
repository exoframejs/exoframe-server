// our modules
const deploy = require('./deploy');
const list = require('./list');
const remove = require('./remove');
const logs = require('./logs');
const registries = require('./registries');
const update = require('./update');
const version = require('./version');
const templates = require('./templates');
const setup = require('./setup');
const secrets = require('./secrets');

module.exports = (fastify, opts, next) => {
  // enable auth for all routes
  fastify.addHook('preHandler', fastify.auth([fastify.verifyJWT]));

  deploy(fastify);
  list(fastify);
  remove(fastify);
  logs(fastify);
  registries(fastify);
  update(fastify);
  version(fastify);
  templates(fastify);
  setup(fastify);
  secrets(fastify);

  next();
};
