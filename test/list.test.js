/* eslint-env jest */
// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const docker = require('../src/docker/docker');

// options base
const options = {
  method: 'GET',
  url: '/list',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
};

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

let fastify;
let containerConfig1;
let container1;
let containerConfig2;
let container2;

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // create test deployments to list
  containerConfig1 = generateContainerConfig({
    name: 'listtest1',
    username: 'admin',
    project: 'listtest1',
    baseName: 'exo-admin-listtest1',
  });
  containerConfig2 = generateContainerConfig({
    name: 'listtest2',
    username: 'admin',
    project: 'listtest2',
    baseName: 'exo-admin-listtest2',
  });
  [container1, container2] = await Promise.all([
    docker.createContainer(containerConfig1),
    docker.createContainer(containerConfig2),
  ]);
  await Promise.all([container1.start(), container2.start()]);

  return fastify;
});

afterAll(() => fastify.close());

test('Should list deployed projects', done => {
  fastify.inject(options, async response => {
    const result = JSON.parse(response.payload);

    // check response
    expect(response.statusCode).toEqual(200);
    expect(result.length).toBeGreaterThanOrEqual(2);

    // check container info
    const container = result.find(c => c.Name.includes('listtest1'));
    expect(container.Name.startsWith(`/${containerConfig1.name}`)).toBeTruthy();
    expect(container.Config.Labels['exoframe.deployment']).toEqual(containerConfig1.Labels['exoframe.deployment']);
    expect(container.Config.Labels['exoframe.user']).toEqual(containerConfig1.Labels['exoframe.user']);
    expect(container.Config.Labels['traefik.backend']).toEqual(containerConfig1.Labels['traefik.backend']);
    expect(container.Config.Labels['traefik.frontend.rule']).toEqual(containerConfig1.Labels['traefik.frontend.rule']);

    // check second container info
    const containerTwo = result.find(r => r.Name.startsWith(`/${containerConfig2.name}`));
    expect(containerTwo.Name.startsWith(`/${containerConfig2.name}`)).toBeTruthy();
    expect(containerTwo.Config.Labels['exoframe.deployment'].startsWith(containerConfig2.name)).toBeTruthy();
    expect(containerTwo.Config.Labels['exoframe.user']).toEqual(containerConfig2.Labels['exoframe.user']);
    expect(containerTwo.Config.Labels['traefik.backend']).toEqual(containerConfig2.Labels['traefik.backend']);
    expect(containerTwo.Config.Labels['traefik.frontend.rule']).toEqual('Host:test');

    await container1.remove({force: true});
    await container2.remove({force: true});

    done();
  });
});
