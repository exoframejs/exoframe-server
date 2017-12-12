/* eslint-env jest */
// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');
const docker = require('../src/docker/docker');
const {pullImage, initDocker} = require('../src/docker/init');

// old traefik and server images
const traefikTag = 'traefik:1.3-alpine';
const serverTag = 'exoframe/server:1.0.0';

// options base
const baseOptions = {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${authToken}`,
  },
  payload: {},
};

// container vars
let fastify;
let oldTraefik;
let oldServer;

// set timeout to 60s because we need to pull stuff
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);

  // pull older traefik image
  // remove current images
  // get all images
  const oldImages = await docker.listImages();
  // remove current :latest images
  const latestTraefik = oldImages.find(img => img.RepoTags && img.RepoTags.includes('traefik:latest'));
  if (latestTraefik) {
    const limg = docker.getImage(latestTraefik.Id);
    await limg.remove({force: true});
  }
  const latestServer = oldImages.find(img => img.RepoTags && img.RepoTags.includes('exoframe/server:latest'));
  if (latestServer) {
    const lsimg = docker.getImage(latestServer.Id);
    await lsimg.remove({force: true});
  }
  // pull older images
  await pullImage(traefikTag);
  await pullImage(serverTag);
  // get all images
  const images = await docker.listImages();
  // get old one and tag it as latest
  oldTraefik = images.find(img => img.RepoTags && img.RepoTags.includes(traefikTag));
  const timg = docker.getImage(oldTraefik.Id);
  await timg.tag({repo: 'traefik', tag: 'latest'});
  oldServer = images.find(img => img.RepoTags && img.RepoTags.includes(serverTag));
  const simg = docker.getImage(oldServer.Id);
  await simg.tag({repo: 'exoframe/server', tag: 'latest'});

  // start old server instance
  const srvConfig = {
    Image: 'exoframe/server:latest',
    name: `exoframe-server-test`,
    Env: ['test=var'],
    Labels: {test: 'label'},
    HostConfig: {
      Binds: ['/var/run/docker.sock:/var/run/docker.sock'],
    },
  };
  // start server
  const oldServerContainer = await docker.createContainer(srvConfig);
  await oldServerContainer.start();

  return fastify;
});

afterAll(() => fastify.close());

test('Should deploy traefik', async done => {
  // remove any existing containers first
  const initialContainers = await docker.listContainers({all: true});
  // try to find traefik instance
  const traefik = initialContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));
  // if found - stop/remove
  if (traefik) {
    const traefikContainer = docker.getContainer(traefik.Id);
    if (!traefik.Status.includes('Exited')) {
      await traefikContainer.stop();
    }
    await traefikContainer.remove();
  }

  // call init
  await initDocker();

  // check docker services
  const allContainers = await docker.listContainers();
  const container = allContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));

  expect(container).toBeDefined();
  expect(container.Names[0]).toEqual('/exoframe-traefik');
  expect(container.Labels['exoframe.deployment']).toEqual('exo-traefik');
  expect(container.Labels['exoframe.user']).toEqual('admin');
  expect(container.NetworkSettings.Networks.exoframe).toBeDefined();
  expect(container.Ports.length).toEqual(2);
  expect(container.Ports.find(p => p.PrivatePort === 443)).toBeTruthy();
  expect(container.Ports.find(p => p.PublicPort === 443)).toBeTruthy();
  expect(container.Ports.find(p => p.PrivatePort === 80)).toBeTruthy();
  expect(container.Ports.find(p => p.PublicPort === 80)).toBeTruthy();
  expect(container.Mounts.find(m => m.Destination === '/var/run/docker.sock')).toBeTruthy();
  expect(container.Mounts.find(m => m.Destination === '/var/acme')).toBeTruthy();

  // cleanup
  const instance = docker.getContainer(container.Id);
  await instance.stop();
  await instance.remove();

  done();
});

// run update test
test('Should update traefik', done => {
  const options = Object.assign({}, baseOptions, {
    url: '/update/traefik',
  });

  fastify.inject(options, async response => {
    // check response
    expect(response.statusCode).toEqual(200);

    // check docker services
    const allImages = await docker.listImages();
    const newTraefik = allImages.find(it => it.RepoTags && it.RepoTags.includes('traefik:latest'));
    expect(newTraefik.Id).not.toBe(oldTraefik.Id);

    done();
  });
});

// run update test
test('Should update server', done => {
  // options base
  const options = Object.assign({}, baseOptions, {
    url: '/update/server',
  });

  fastify.inject(options, async response => {
    // check response
    expect(response.statusCode).toEqual(200);

    // check docker services
    const allImages = await docker.listImages();
    const newServer = allImages.find(it => it.RepoTags && it.RepoTags.includes('exoframe/server:latest'));
    expect(newServer.Id).not.toBe(oldServer.Id);

    // cleanup
    const allContainers = await docker.listContainers();
    const containerTraefik = allContainers.find(c => c.Names.find(n => n === '/exoframe-traefik'));
    const containerServer = allContainers.find(
      c => c.Image === 'exoframe/server:latest' && c.Names.find(n => n.startsWith('/exoframe-server'))
    );
    const srvInst = docker.getContainer(containerServer.Id);
    await srvInst.remove({force: true});
    const trInst = docker.getContainer(containerTraefik.Id);
    await trInst.remove({force: true});

    done();
  });
});
