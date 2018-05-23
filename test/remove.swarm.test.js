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

// options base
const baseOptions = {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  payload: {},
};

// project & service names
const serviceName = 'rmtest1';
const projectName = 'rmtestproject';

// fastify ref
let fastify;

const generateServiceConfig = ({name, username, project, baseName}) => ({
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
      Command: ['sh', '-c', 'sleep 1000'],
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

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // pull busybox:latest
  await pullImage('busybox:latest');

  // create test service to get single deployment logs
  const serviceConfig = generateServiceConfig({
    name: serviceName,
    username: 'admin',
    project: 'rmtest1',
    baseName: 'exo-admin-rmtest1',
  });
  await docker.createService(serviceConfig);
  // create test project to remove
  // first project service
  const prjServiceConfig1 = generateServiceConfig({
    name: 'rmtest2',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-rmtest2',
  });
  await docker.createService(prjServiceConfig1);
  // second project service
  const prjServiceConfig2 = generateServiceConfig({
    name: 'rmtest3',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-rmtest3',
  });
  await docker.createService(prjServiceConfig2);

  return fastify;
});

afterAll(() => fastify.close());

test('Should remove current deployment from swarm', async done => {
  const options = Object.assign({}, baseOptions, {
    url: `/remove/${serviceName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(204);

  // check docker services
  const allServices = await docker.listServices();
  const exService = allServices.find(c => c.Spec.Name === serviceName);
  expect(exService).toBeUndefined();

  done();
});

test('Should remove current project from swarm', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/remove/${projectName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(204);

  // check docker services
  const allServices = await docker.listServices();
  const prjServices = allServices.filter(c => c.Spec.Labels['exoframe.project'] === projectName);
  expect(prjServices.length).toEqual(0);

  done();
});

test('Should return error when removing nonexistent project from swarm', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/remove/do-not-exist`,
  });

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);
  // check response
  expect(response.statusCode).toEqual(404);
  expect(result).toMatchObject({error: 'Service not found!'});
  done();
});
