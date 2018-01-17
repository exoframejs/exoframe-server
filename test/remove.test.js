/* eslint-env jest */
// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const docker = require('../src/docker/docker');

// options base
const baseOptions = {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  payload: {},
};

// project & container names
const containerName = 'rmtest1';
const projectName = 'rmtestproject';

// container vars
let fastify;
let container;
let projectContainer1;
let projectContainer2;

const generateContainerConfig = ({name, username, project, baseName}) => ({
  Image: 'busybox:latest',
  Cmd: ['sh', '-c', 'sleep 1000'],
  name,
  Labels: {
    'exoframe.deployment': name,
    'exoframe.user': username,
    'exoframe.project': project,
    'traefik.backend': baseName,
    'traefik.frontend.rule': 'Host:test',
  },
});

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // create test container to get single deployment logs
  const containerConfig = generateContainerConfig({
    name: containerName,
    username: 'admin',
    project: 'rmtest1',
    baseName: 'exo-admin-rmtest1',
  });
  container = await docker.createContainer(containerConfig);
  await container.start();
  // create test project to remove
  // first project container
  const prjContainerConfig1 = generateContainerConfig({
    name: 'rmtest2',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-rmtest2',
  });
  projectContainer1 = await docker.createContainer(prjContainerConfig1);
  await projectContainer1.start();
  // second project container
  const prjContainerConfig2 = generateContainerConfig({
    name: 'rmtest3',
    username: 'admin',
    project: projectName,
    baseName: 'exo-admin-rmtest3',
  });
  projectContainer2 = await docker.createContainer(prjContainerConfig2);
  await projectContainer2.start();

  return fastify;
});

afterAll(() => fastify.close());

test('Should remove current deployment', async done => {
  const options = Object.assign({}, baseOptions, {
    url: `/remove/${containerName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(204);

  // check docker services
  const allContainers = await docker.listContainers();
  const exContainer = allContainers.find(c => c.Names.includes(`/${containerName}`));
  expect(exContainer).toBeUndefined();

  done();
});

test('Should remove current project', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/remove/${projectName}`,
  });

  const response = await fastify.inject(options);
  // check response
  expect(response.statusCode).toEqual(204);

  // check docker services
  const allContainers = await docker.listContainers();
  const prjContainers = allContainers.filter(c => c.Labels['exoframe.project'] === projectName);
  expect(prjContainers.length).toEqual(0);

  done();
});

test('Should return error when removing nonexistent project', async done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: `/remove/do-not-exist`,
  });

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);
  // check response
  expect(response.statusCode).toEqual(404);
  expect(result).toMatchObject({error: 'Container not found!'});
  done();
});
