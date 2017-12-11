/* eslint global-require: 0 */
// config
const {waitForConfig} = require('../src/config');
// server setup
const {startServer} = require('../src');
const {initNetwork} = require('../src/docker/init');

// tests
const login = require('./login');
const deploy = require('./deploy');
const list = require('./list');
const logs = require('./logs');
const remove = require('./remove');
const update = require('./update');
const dockerInit = require('./docker-init');
const version = require('./version');

const run = async () => {
  // wait for config
  await waitForConfig();
  // create docker network
  await initNetwork();

  // test docker init
  await dockerInit();

  // create new server
  const fastify = await startServer();

  // test login and get token
  const token = await login(fastify);
  // test deployment
  await deploy(fastify, token);
  // test listing
  const name = await list(fastify, token);
  // test logs
  await logs(fastify, token, name);
  // test removal
  await remove(fastify, token, name);
  // test update
  await update(fastify, token);
  // test version
  await version(fastify, token);

  // stop server
  fastify.close();
};
run();
