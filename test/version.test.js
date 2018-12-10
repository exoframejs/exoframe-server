/* eslint-env jest */
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));

// npm packages
const getPort = require('get-port');
const nock = require('nock');

// our packages
const authToken = require('./fixtures/authToken');
const serverReleasesJSON = require('./fixtures/version/server-releases.json');
const traefikReleasesJSON = require('./fixtures/version/traefik-releases.json');
const {startServer} = require('../src');

// setup github API mocking to evade rate limits in CI
nock('https://api.github.com/repos')
  .get('/exoframejs/exoframe-server/releases')
  .reply(200, serverReleasesJSON)
  .get('/containous/traefik/releases')
  .reply(200, traefikReleasesJSON);

// container vars
let fastify;

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);
  return fastify;
});

afterAll(() => fastify.close());

test('Should get current and latest versions', async done => {
  // options base
  const options = {
    method: 'GET',
    url: '/version',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check response
  expect(response.statusCode).toEqual(200);
  expect(result.server).toBeDefined();
  expect(result.traefik).toBeDefined();
  expect(result.latestServer).toBeDefined();
  expect(result.latestTraefik).toBeDefined();

  done();
});
