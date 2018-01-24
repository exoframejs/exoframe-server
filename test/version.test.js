/* eslint-env jest */
// npm packages
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {startServer} = require('../src');

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
