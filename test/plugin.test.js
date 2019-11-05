/* eslint-env jest */
const path = require('path');
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));
jest.mock('../src/util', () => require('./__mocks__/util'));
jest.mock('./fixtures/plugins/node_modules/testplugin', () => require('./__mocks__/testplugin'), {virtual: true});
const config = require('../src/config');
// switch config to plugins
config.__load('plugins');

// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {secretsInited} = require('../src/db/secrets');
const {initPlugins, getPlugins} = require('../src/plugins');
const {initDocker} = require('../src/docker/init');
const {start, startFromParams} = require('../src/docker/start');
const {startServer} = require('../src');

// test project path
const testProjectPath = path.join(__dirname, 'fixtures', 'html-project');
// options base
const options = {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
};

beforeAll(async done => {
  await secretsInited;
  await initPlugins();
  done();
});

test('Should init plugins', async done => {
  const plugins = getPlugins();
  expect(plugins.length).toEqual(1);

  const testPlugin = plugins[0];
  expect(testPlugin).toMatchSnapshot();

  done();
});

test('init', async done => {
  await initDocker();

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.init).toBeCalled();

  done();
});

test('start', async done => {
  await start({image: 'test', username: 'admin', folder: testProjectPath, resultStream: {}});

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.start).toBeCalled();

  done();
});

test('startFromParams', async done => {
  await startFromParams({
    image: 'test',
    deploymentName: 'test-deploy',
    projectName: 'test-project',
    username: 'admin',
    backendName: 'back',
    frontend: 'front',
    hostname: 'host',
    restartPolicy: 'always',
  });

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.startFromParams).toBeCalled();

  done();
});

test('list', async done => {
  // start server
  const port = await getPort();
  const fastify = await startServer(port);

  const response = await fastify.inject({...options, url: '/list'});
  const result = JSON.parse(response.payload);

  // check response
  expect(result).toBeDefined();
  expect(response.statusCode).toEqual(200);

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.list).toBeCalled();

  await fastify.close();
  done();
});

test('logs', async done => {
  // start server
  const port = await getPort();
  const fastify = await startServer(port);

  const response = await fastify.inject({...options, url: '/logs/test'});
  const result = JSON.parse(response.payload);

  // check response
  expect(result).toBeDefined();
  expect(response.statusCode).toEqual(200);

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.logs).toBeCalled();

  await fastify.close();
  done();
});

test('remove', async done => {
  // start server
  const port = await getPort();
  const fastify = await startServer(port);

  const response = await fastify.inject({...options, method: 'POST', url: `/remove/test`});
  const result = JSON.parse(response.payload);

  // check response
  expect(result).toBeDefined();
  expect(response.statusCode).toEqual(200);

  const plugins = getPlugins();
  const testPlugin = plugins[0];
  expect(testPlugin.remove).toBeCalled();

  await fastify.close();
  done();
});
