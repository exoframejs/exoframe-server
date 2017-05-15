/* eslint global-require: 0 */
// config
const {waitForConfig} = require('../src/config');
// server setup
const {setupServer} = require('../src');

// tests
const login = require('./login');
const deploy = require('./deploy');
const list = require('./list');
const remove = require('./remove');
const dockerInit = require('./docker-init');

const run = async () => {
  // wait for config
  await waitForConfig();

  // create new server
  const server = await setupServer();

  // test login and get token
  const token = await login(server);
  // test deployment
  deploy(server, token);
  // test listing
  const name = await list(server, token);
  // test removal
  remove(server, token, name);
  // test docker init
  dockerInit();

  // stop server
  await server.stop();
};
run();
