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
const options = {
  method: 'GET',
  url: '/list',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
};

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

let fastify;
let serviceConfig1;
let service1;
let serviceConfig2;
let service2;

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // pull busybox:latest
  await pullImage('busybox:latest');

  // create test deployments to list
  serviceConfig1 = generateServiceConfig({
    name: 'listtest1',
    username: 'admin',
    project: 'listtest1',
    baseName: 'exo-admin-listtest1',
  });
  serviceConfig2 = generateServiceConfig({
    name: 'listtest2',
    username: 'admin',
    project: 'listtest2',
    baseName: 'exo-admin-listtest2',
  });
  [service1, service2] = await Promise.all([
    docker.createService(serviceConfig1),
    docker.createService(serviceConfig2),
  ]);
  await Promise.all([service1.inspect(), service2.inspect()]);

  return fastify;
});

afterAll(() => fastify.close());

test('Should list deployed projects in swarm', async done => {
  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check response
  expect(response.statusCode).toEqual(200);
  expect(result.services).toBeDefined();
  expect(result.containers).toBeDefined();
  expect(result.services.length).toBeGreaterThanOrEqual(2);

  // check container info
  const service = result.services.find(c => c.Spec.Name === serviceConfig1.Name);
  expect(service).toBeDefined();
  expect(service.Spec.Labels['exoframe.deployment']).toEqual(serviceConfig1.Labels['exoframe.deployment']);
  expect(service.Spec.Labels['exoframe.user']).toEqual(serviceConfig1.Labels['exoframe.user']);
  expect(service.Spec.Labels['traefik.backend']).toEqual(serviceConfig1.Labels['traefik.backend']);
  expect(service.Spec.Labels['traefik.frontend.rule']).toEqual(serviceConfig1.Labels['traefik.frontend.rule']);

  // check second container info
  const serviceTwo = result.services.find(r => r.Spec.Name === serviceConfig2.Name);
  expect(serviceTwo).toBeDefined();
  expect(serviceTwo.Spec.Labels['exoframe.deployment'].startsWith(serviceConfig2.Name)).toBeTruthy();
  expect(serviceTwo.Spec.Labels['exoframe.user']).toEqual(serviceConfig2.Labels['exoframe.user']);
  expect(serviceTwo.Spec.Labels['traefik.backend']).toEqual(serviceConfig2.Labels['traefik.backend']);
  expect(serviceTwo.Spec.Labels['traefik.frontend.rule']).toEqual('Host:test');

  await service1.remove();
  await service2.remove();

  done();
});
