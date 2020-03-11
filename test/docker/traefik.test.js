/* eslint-env jest */
// mock config for testing
jest.mock('../../src/config', () => require('../__mocks__/config'));

// npm packages
const getPort = require('get-port');

// our packages
const {startServer} = require('../../src');
const {getConfig, waitForConfig} = require('../../src/config');
const docker = require('../../src/docker/docker');
const {initTraefik} = require('../../src/docker/traefik');
const {initNetwork} = require('../../src/docker/network');

// container vars
let fastify;
let config;

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // get config
  await waitForConfig();
  config = getConfig();

  return fastify;
});

afterAll(() => fastify.close());

describe('Traefik', () => {
  let exoNet;
  let container;

  beforeAll(async () => {
    // create exoframe network if needed
    exoNet = await initNetwork();

    // run traefik init
    await initTraefik(exoNet);

    // get traefik container
    const allContainers = await docker.listContainers();
    container = allContainers.find(c => c.Names.find(n => n === `/${config.traefikName}`));
  });

  test('Should start traefik container', () => {
    expect(container).toBeDefined();
    expect(container.State).toBe('running');
  });

  test('Should attach traefik to network', () => {
    expect(container.NetworkSettings.Networks.exoframe).toBeDefined();
  });

  test('Should open traefik ports', () => {
    expect(container.Ports.length).toEqual(2);
    expect(container.Ports.find(p => p.PrivatePort === 443)).toBeTruthy();
    expect(container.Ports.find(p => p.PublicPort === 443)).toBeTruthy();
    expect(container.Ports.find(p => p.PrivatePort === 80)).toBeTruthy();
    expect(container.Ports.find(p => p.PublicPort === 80)).toBeTruthy();
  });

  test('Should mount config folder to traefik', () => {
    console.log(container.Mounts);
    expect(container.Mounts.find(m => m.Destination === '/var/run/docker.sock')).toBeTruthy();
    expect(container.Mounts.find(m => m.Destination === '/var/traefik')).toBeTruthy();
  });
});
