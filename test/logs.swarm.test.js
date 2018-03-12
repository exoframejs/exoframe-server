/* eslint-env jest */
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));
const config = require('../src/config');
// switch config to swarm
config.__load('swarm');

// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const {pullImage} = require('../src/docker/init');
const docker = require('../src/docker/docker');
const {sleep} = require('../src/util');

// options base
const baseOptions = {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
};

const generateServiceConfig = ({name, cmd, username, project, baseName}) => ({
  Name: name,
  Labels: {
    'exoframe.deployment': name,
    'exoframe.user': username,
    'exoframe.project': project,
    'traefik.backend': baseName,
    'traefik.frontend.rule': 'Host:test',
  },
  TaskTemplate: {
    ContainerSpec: {
      Image: 'busybox:latest',
      Command: ['sh', '-c', `${cmd}; sleep 1000`],
      Resources: {
        Limits: {},
        Reservations: {},
      },
      RestartPolicy: {},
      Placement: {},
    },
  },
  Mode: {
    Replicated: {
      Replicas: 1,
    },
  },
  UpdateConfig: {},
});

// project & container names
const serviceName = 'logtest1';
const projectName = 'logtestproject';

// container vars
let fastify;
let container;
let projectContainer1;
let projectContainer2;

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // pull busybox:latest
  await pullImage('busybox:latest');

  // create test container to get single deployment logs
  const serviceConfig = generateServiceConfig({
    cmd: 'echo "123"',
    name: serviceName,
    username: 'admin',
    project: 'logtest1',
    baseName: 'exo-admin-logtest1',
  });
  container = await docker.createService(serviceConfig);
  // create test deployments to get project logs
  // first project container
  const prjServiceConfig1 = generateServiceConfig({
    cmd: 'echo "123"',
    name: 'logtest2',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-logtest2',
  });
  projectContainer1 = await docker.createService(prjServiceConfig1);
  // second project container
  const prjServiceConfig2 = generateServiceConfig({
    cmd: 'echo "asd"',
    name: 'logtest3',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-logtest3',
  });
  projectContainer2 = await docker.createService(prjServiceConfig2);

  // wait for 10s to let services spin up
  await sleep(10000);

  return fastify;
});

afterAll(() => fastify.close());

test('Should get logs for current deployment from swarm', async done => {
  const options = Object.assign({}, baseOptions, {
    url: `/logs/${serviceName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(200);

  // check logs
  const lines = response.payload
    // split by lines
    .split('\n')
    // remove unicode chars
    .map(line => line.replace(/^\u0001.+?\d/, '').replace(/\n+$/, ''))
    // filter blank lines
    .filter(line => line && line.length > 0)
    // remove timestamps
    .map(line => {
      const parts = line.split(/\dZ\s/);
      return parts[1].replace(/\sv\d.+/, ''); // strip any versions
    });
  expect(lines).toMatchObject(['123']);

  // cleanup
  await container.remove();

  done();
});

test('Should get logs for current project from swarm', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/logs/${projectName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(200);

  const text = response.payload
    // split by lines
    .split('\n')
    // remove unicode chars
    .map(line => line.replace(/^\u0001.+?\d/, '').replace(/\n+$/, ''))
    // filter blank lines
    .filter(line => line && line.length > 0)
    // remove timestamps
    .map(line => {
      if (line.startsWith('Logs for')) {
        return line;
      }
      const parts = line.split(/\dZ\s/);
      return parts[1].replace(/\sv\d.+/, ''); // strip any versions
    });
  expect(text).toEqual(expect.arrayContaining(['Logs for logtest3', 'asd', 'Logs for logtest2', '123']));

  // cleanup
  await projectContainer1.remove();
  await projectContainer2.remove();

  done();
});

test('Should not get logs for nonexistent project', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/logs/do-not-exist`,
  });

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);
  // check response
  expect(response.statusCode).toEqual(404);
  expect(result).toMatchObject({error: 'Service not found!'});
  done();
});
