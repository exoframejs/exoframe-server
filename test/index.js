/* eslint global-require: 0 */
// config
const {waitForConfig} = require('../src/config');
// server setup
const {setupServer} = require('../src');
const {initNetwork} = require('../src/docker/init');

// tests
const login = require('./login');
const deploy = require('./deploy');
const list = require('./list');
const logs = require('./logs');
const remove = require('./remove');
const update = require('./update');
const dockerInit = require('./docker-init');

const run = async () => {
  // wait for config
  await waitForConfig();
  // create docker network
  await initNetwork();

  // test docker init
  await dockerInit();

  // create new server
  const server = await setupServer();

  // test login and get token
  const token = await login(server);
  // test deployment
  await deploy(server, token);
  // test listing
  const name = await list(server, token);
  // test logs
  await logs(server, token, name);
  // test removal
  await remove(server, token, name);
  // test update
  await update(server, token);

  // stop server
  await server.stop();
};
run();
