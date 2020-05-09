/* eslint-env jest */
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));
const config = require('../src/config');
// switch config to normal
config.__load('normal');

// npm packages
const getPort = require('get-port');
const path = require('path');
const tar = require('tar-fs');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const {dbLoaded, getSecretsCollection} = require('../src/db');
const docker = require('../src/docker/docker');

// create tar streams
const streamDocker = tar.pack(path.join(__dirname, 'fixtures', 'secrets-project'));

// test secret
const testSecret = {
  secretName: 'test-secret',
  secretValue: 'test-secret-value',
};

// container vars
let fastify;

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  await dbLoaded;

  return fastify;
});

afterAll(() => fastify.close());

test('Should create new secret', async done => {
  // options base
  const options = {
    method: 'POST',
    url: '/secrets',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    payload: testSecret,
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check response
  expect(response.statusCode).toEqual(200);
  expect(result.name).toEqual(testSecret.secretName);
  expect(result.value).toEqual(testSecret.secretValue);
  expect(result.user).toEqual('admin');

  done();
});

test('Should get list with new secret', async done => {
  // options base
  const options = {
    method: 'GET',
    url: '/secrets',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check response
  expect(response.statusCode).toEqual(200);
  expect(result.secrets).toBeDefined();
  expect(result.secrets.length).toEqual(1);
  expect(result.secrets[0].user).toEqual('admin');
  expect(result.secrets[0].name).toEqual(testSecret.secretName);
  expect(result.secrets[0].value).toBeUndefined();

  done();
});

test('Should get value for the secret', async done => {
  // options base
  const options = {
    method: 'GET',
    url: `/secrets/${testSecret.secretName}`,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check response
  expect(response.statusCode).toEqual(200);
  expect(result.secret).toBeDefined();
  expect(result.secret.user).toEqual('admin');
  expect(result.secret.name).toEqual(testSecret.secretName);
  expect(result.secret.value).toEqual(testSecret.secretValue);

  done();
});

test('Should deploy simple docker project with secret', async done => {
  const options = {
    method: 'POST',
    url: '/deploy',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/octet-stream',
    },
    payload: streamDocker,
  };

  const response = await fastify.inject(options);
  // parse result into lines
  const result = response.payload
    .split('\n')
    .filter(l => l && l.length)
    .map(line => JSON.parse(line));

  // find deployments
  const completeDeployments = result.find(it => it.deployments && it.deployments.length).deployments;

  // check response
  expect(response.statusCode).toEqual(200);
  expect(completeDeployments.length).toEqual(1);
  expect(completeDeployments[0].Name.startsWith('/exo-admin-test-secrets-deploy-')).toBeTruthy();

  // check docker services
  const allContainers = await docker.listContainers();
  const containerInfo = allContainers.find(c => c.Names.includes(completeDeployments[0].Name));
  expect(containerInfo).toBeDefined();

  const containerData = docker.getContainer(containerInfo.Id);
  const container = await containerData.inspect();

  // check secrets replacement in env vars
  const [key, value] = container.Config.Env.map(v => v.split('=')).find(([key]) => key === 'test');
  expect(key).toEqual('test');
  expect(value).toEqual(testSecret.secretValue);

  // cleanup
  const instance = docker.getContainer(containerInfo.Id);
  await instance.remove({force: true});

  done();
});

test('Should delete new secret', async done => {
  // options base
  const options = {
    method: 'DELETE',
    url: '/secrets',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    payload: {
      secretName: testSecret.secretName,
    },
  };

  // check response
  const response = await fastify.inject(options);
  expect(response.statusCode).toEqual(204);

  // make sure it's no longer in db
  expect(getSecretsCollection().find()).toEqual([]);

  done();
});
