/* eslint-env jest */
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));
const config = require('../src/config');
// switch config to swarm
config.__load('swarm');

// npm packages
const path = require('path');
const tar = require('tar-fs');
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const docker = require('../src/docker/docker');
const {initNetwork} = require('../src/docker/network');

// create tar streams
const streamDocker = tar.pack(path.join(__dirname, 'fixtures', 'docker-project'));
const streamNode = tar.pack(path.join(__dirname, 'fixtures', 'node-project'));
const streamHtml = tar.pack(path.join(__dirname, 'fixtures', 'html-project'));
const streamHtmlUpdate = tar.pack(path.join(__dirname, 'fixtures', 'html-project'));
const streamCompose = tar.pack(path.join(__dirname, 'fixtures', 'compose-v3-project'));
const streamComposeUpdate = tar.pack(path.join(__dirname, 'fixtures', 'compose-v3-project'));
const streamBrokenCompose = tar.pack(path.join(__dirname, 'fixtures', 'compose-project'));
const streamBrokenDocker = tar.pack(path.join(__dirname, 'fixtures', 'broken-docker-project'));
const streamBrokenNode = tar.pack(path.join(__dirname, 'fixtures', 'broken-node-project'));
const streamAdditionalLabels = tar.pack(path.join(__dirname, 'fixtures', 'additional-labels'));
const streamTemplate = tar.pack(path.join(__dirname, 'fixtures', 'template-project'));

// options base
const optionsBase = {
  method: 'POST',
  url: '/deploy',
  headers: {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/octet-stream',
  },
};

// storage vars
let fastify;
let simpleHtmlInitialDeploy = '';
let composeDeployOne = '';
let composeDeployTwo = '';

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async done => {
  // start new instance of fastify
  const port = await getPort();
  fastify = await startServer(port);
  // init docker network
  await initNetwork();

  done();
});

afterAll(async done => {
  fastify.close();

  // clean all exited containers
  const allContainers = await docker.listContainers({all: true});
  const exitedWithError = allContainers.filter(c => c.Status.includes('Exited (1)'));
  await Promise.all(exitedWithError.map(c => docker.getContainer(c.Id)).map(c => c.remove()));

  done();
});

test('Should deploy simple docker project to swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamDocker,
  });

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

  // check name
  const name = completeDeployments[0].Spec.Name;
  expect(name.startsWith('exo-admin-test-docker-deploy-')).toBeTruthy();

  // check docker services
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Name === name);

  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.Spec.Labels['exoframe.deployment']).toEqual(name);
  expect(serviceInfo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceInfo.Spec.Labels['exoframe.project']).toEqual('test-project');
  expect(serviceInfo.Spec.Labels['traefik.backend']).toEqual(`${name}.test`);
  expect(serviceInfo.Spec.Networks.length).toEqual(1);
  expect(serviceInfo.Spec.Networks[0].Aliases.includes('test')).toBeTruthy();
  expect(serviceInfo.Spec.TaskTemplate.RestartPolicy).toMatchObject({Condition: 'any', MaxAttempts: 0});

  // cleanup
  const instance = docker.getService(serviceInfo.ID);
  await instance.remove();

  done();
});

test('Should deploy simple node project to swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamNode,
  });

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

  // check name
  const name = completeDeployments[0].Spec.Name;
  expect(name.startsWith('exo-admin-test-node-deploy-')).toBeTruthy();

  // check docker services
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Name === name);
  const deployId = name
    .split('-')
    .slice(-1)
    .shift();

  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.Spec.Labels['exoframe.deployment']).toEqual(name);
  expect(serviceInfo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceInfo.Spec.Labels['exoframe.project']).toEqual(name.replace(`-${deployId}`, ''));
  expect(serviceInfo.Spec.Labels['traefik.backend']).toEqual('localhost');
  expect(serviceInfo.Spec.Labels['traefik.frontend.rule']).toEqual('Host:localhost');
  expect(serviceInfo.Spec.Networks.length).toEqual(1);

  // cleanup
  const instance = docker.getService(serviceInfo.ID);
  await instance.remove();

  done();
});

test('Should deploy simple HTML project to swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamHtml,
  });

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
  // check name
  const name = completeDeployments[0].Spec.Name;
  expect(name.startsWith('exo-admin-test-html-deploy-')).toBeTruthy();

  // check docker services
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Name === name);

  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.Spec.Labels['exoframe.deployment']).toEqual(name);
  expect(serviceInfo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceInfo.Spec.Labels['exoframe.project']).toEqual('simple-html');
  expect(serviceInfo.Spec.Labels['traefik.backend']).toEqual(name);
  expect(serviceInfo.Spec.Labels['traefik.frontend.rule']).toBeUndefined();
  expect(serviceInfo.Spec.Networks.length).toEqual(1);

  // store initial deploy id
  simpleHtmlInitialDeploy = serviceInfo.ID;

  done();
});

test('Should update simple HTML project in swarm', async done => {
  const options = Object.assign(optionsBase, {
    url: '/update',
    payload: streamHtmlUpdate,
  });

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
  const name = completeDeployments[0].Spec.Name;
  expect(name.startsWith('exo-admin-test-html-deploy-')).toBeTruthy();

  // check docker services
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Name === name);

  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.ID).toEqual(simpleHtmlInitialDeploy);
  expect(serviceInfo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceInfo.Spec.Labels['exoframe.project']).toEqual('simple-html');
  expect(serviceInfo.Spec.Labels['traefik.frontend.rule']).toBeUndefined();
  expect(serviceInfo.Spec.Networks.length).toEqual(1);

  // cleanup
  const instance = docker.getService(serviceInfo.ID);
  await instance.remove();

  done();
});

test('Should deploy simple compose project to swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamCompose,
  });

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
  expect(completeDeployments.length).toEqual(2);

  // check names
  const nameOne = completeDeployments[0].Spec.Name;
  const nameTwo = completeDeployments[1].Spec.Name;
  expect(nameOne).toEqual('exo-admin-test-compose-deploy_web');
  expect(nameTwo).toEqual('exo-admin-test-compose-deploy_redis');

  // check docker services
  const allServices = await docker.listServices();
  const serviceOne = allServices.find(c => c.Spec.Name === nameOne);
  const serviceTwo = allServices.find(c => c.Spec.Name === nameTwo);

  expect(serviceOne).toBeDefined();
  expect(serviceTwo).toBeDefined();
  expect(serviceOne.Spec.Labels['exoframe.deployment'].startsWith(nameOne.replace('_web', ''))).toBeTruthy();
  expect(serviceTwo.Spec.Labels['exoframe.deployment'].startsWith(nameTwo.replace('_redis', ''))).toBeTruthy();
  expect(serviceOne.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceTwo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceOne.Spec.Labels['exoframe.project']).toEqual(nameOne.replace('_web', ''));
  expect(serviceTwo.Spec.Labels['exoframe.project']).toEqual(nameTwo.replace('_redis', ''));
  expect(serviceOne.Spec.Labels['traefik.backend']).toEqual(nameOne.replace('_web', '-web'));
  expect(serviceTwo.Spec.Labels['traefik.backend']).toEqual(nameTwo.replace('_redis', '-redis'));
  expect(serviceOne.Spec.Labels['traefik.frontend.rule']).toEqual('Host:test.dev');
  expect(serviceOne.Spec.TaskTemplate.Networks.length).toEqual(2);
  expect(serviceTwo.Spec.TaskTemplate.Networks.length).toEqual(2);

  // store ids for update test
  composeDeployOne = serviceOne.Id;
  composeDeployTwo = serviceTwo.Id;

  done();
});

test('Should update simple compose project in swarm', async done => {
  const options = Object.assign(optionsBase, {
    url: '/update',
    payload: streamComposeUpdate,
  });

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
  expect(completeDeployments.length).toEqual(2);

  // check names
  const nameOne = completeDeployments[0].Spec.Name;
  const nameTwo = completeDeployments[1].Spec.Name;
  expect(nameOne).toEqual('exo-admin-test-compose-deploy_web');
  expect(nameTwo).toEqual('exo-admin-test-compose-deploy_redis');

  // check docker services
  const allServices = await docker.listServices();
  const serviceOne = allServices.find(c => c.Spec.Name === nameOne);
  const serviceTwo = allServices.find(c => c.Spec.Name === nameTwo);

  expect(serviceOne).toBeDefined();
  expect(serviceTwo).toBeDefined();
  expect(serviceOne.Spec.Labels['exoframe.deployment'].startsWith(nameOne.replace('_web', '-web'))).toBeTruthy();
  expect(serviceTwo.Spec.Labels['exoframe.deployment'].startsWith(nameTwo.replace('_redis', '-redis'))).toBeTruthy();
  expect(serviceOne.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceTwo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceOne.Spec.Labels['exoframe.project']).toEqual(nameOne.replace('_web', ''));
  expect(serviceTwo.Spec.Labels['exoframe.project']).toEqual(nameTwo.replace('_redis', ''));
  expect(serviceOne.Spec.Labels['traefik.backend']).toEqual(nameOne.replace('_web', '-web'));
  expect(serviceTwo.Spec.Labels['traefik.backend']).toEqual(nameTwo.replace('_redis', '-redis'));
  expect(serviceOne.Spec.Labels['traefik.frontend.rule']).toEqual('Host:test.dev');
  expect(serviceOne.Spec.TaskTemplate.Networks.length).toEqual(2);
  expect(serviceTwo.Spec.TaskTemplate.Networks.length).toEqual(2);

  // get old containers
  expect(serviceOne.ID).not.toEqual(composeDeployOne);
  expect(serviceTwo.ID).not.toEqual(composeDeployTwo);

  // cleanup
  const instanceOne = docker.getService(serviceOne.ID);
  await instanceOne.remove();
  const instanceTwo = docker.getService(serviceTwo.ID);
  await instanceTwo.remove();

  done();
});

test('Should display error log for broken docker project in swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamBrokenDocker,
  });

  const response = await fastify.inject(options);
  // parse result into lines
  const result = response.payload
    .split('\n')
    .filter(l => l && l.length)
    .map(line => JSON.parse(line));

  // get last error
  const error = result.pop();

  // check response
  expect(response.statusCode).toEqual(200);
  expect(error.message).toEqual('Build failed! See build log for details.');
  expect(error.log[0].includes('Step 1/3 : FROM busybox')).toBeTruthy();
  expect(error.log.find(l => l.includes('Step 2/3 : RUN exit 1'))).toBeDefined();
  expect(error.log[error.log.length - 1]).toEqual("The command '/bin/sh -c exit 1' returned a non-zero code: 1");

  done();
});

test('Should display error log for broken Node.js project in swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamBrokenNode,
  });

  const response = await fastify.inject(options);
  // parse result into lines
  const result = response.payload
    .split('\n')
    .filter(l => l && l.length)
    .map(line => JSON.parse(line));

  // get last error
  const error = result.pop();

  // check response
  expect(response.statusCode).toEqual(200);
  expect(error.message).toEqual('Build failed! See build log for details.');
  expect(error.log[0].includes('Step 1/8 : FROM node:latest')).toBeTruthy();
  expect(error.log.find(l => l.includes('Step 2/8 : RUN mkdir -p /usr/src/app'))).toBeDefined();
  expect(error.log[error.log.length - 1]).toEqual(
    "The command '/bin/sh -c npm install --silent' returned a non-zero code: 1"
  );

  done();
});

test('Should display error log for compose v2 project in swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamBrokenCompose,
  });

  const response = await fastify.inject(options);
  // parse result into lines
  const result = response.payload
    .split('\n')
    .filter(l => l && l.length)
    .map(line => JSON.parse(line));

  // get last error
  const error = result.pop();

  // check response
  expect(response.statusCode).toEqual(200);
  expect(error.message).toEqual('Running in swarm mode, can only deploy docker-compose file of version 3!');

  done();
});

test('Should have additional labels in swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamAdditionalLabels,
  });

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

  // check docker services
  const allServices = await docker.listServices();
  const serviceInfo = allServices.find(c => c.Spec.Name === completeDeployments[0].Spec.Name);
  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.Spec.Labels['custom.label']).toEqual('additional-label');

  // cleanup
  const instance = docker.getService(serviceInfo.ID);
  await instance.remove();

  done();
});

test('Should deploy project with configured template to swarm', async done => {
  const options = Object.assign(optionsBase, {
    payload: streamTemplate,
  });

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
  expect(result[0]).toEqual({message: 'Deploying Static HTML project..', level: 'info'});

  // check docker services
  const allServices = await docker.listServices();
  const name = completeDeployments[0].Spec.Name;
  const serviceInfo = allServices.find(c => c.Spec.Name === name);
  expect(name.startsWith('exo-admin-test-static-deploy-')).toBeTruthy();

  // extract deploy id
  const deployId = name
    .split('-')
    .slice(-1)
    .shift();

  expect(serviceInfo).toBeDefined();
  expect(serviceInfo.Spec.Labels['exoframe.deployment']).toEqual(name);
  expect(serviceInfo.Spec.Labels['exoframe.user']).toEqual('admin');
  expect(serviceInfo.Spec.Labels['exoframe.project']).toEqual(name.replace(`-${deployId}`, ''));
  expect(serviceInfo.Spec.Labels['traefik.backend']).toEqual('localhost');
  expect(serviceInfo.Spec.Labels['traefik.frontend.rule']).toEqual('Host:localhost');
  expect(serviceInfo.Spec.Networks.length).toEqual(1);

  // cleanup
  const instance = docker.getService(serviceInfo.ID);
  await instance.remove();

  done();
});
