/* eslint-env jest */
// mock config for testing
jest.mock('../src/config', () => require('./__mocks__/config'));

// npm packages
const fs = require('fs');
const path = require('path');
const getPort = require('get-port');

// our packages
const authToken = require('./fixtures/authToken');
const {runYarn} = require('../src/util');
const {startServer} = require('../src');
const {recipesFolder} = require('../src/config');

// container vars
let fastify;

// test recipe name
const testInstallRecipe = 'exoframe-recipe-wordpress';
const testRunRecipe = 'test-recipe';

// set timeout to 60s
jest.setTimeout(60000);

beforeAll(async () => {
  // start server
  const port = await getPort();
  fastify = await startServer(port);
  return fastify;
});

afterAll(() => {
  fastify.close();
  runYarn({args: ['remove', '--verbose', testInstallRecipe], cwd: recipesFolder});
});

test('Should install new recipe and return list of questions', async done => {
  // options base
  const options = {
    method: 'GET',
    url: `/setup?recipeName=${testInstallRecipe}`,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check answer
  expect(response.statusCode).toEqual(200);
  expect(result.success).toBeTruthy();
  expect(result.log.length).toBeGreaterThan(0);
  expect(result.questions).toMatchSnapshot();

  // check folder
  const files = fs.readdirSync(path.join(recipesFolder, 'node_modules'));
  expect(files).toContain(testInstallRecipe);

  done();
});

test('Should execute recipe', async done => {
  // write test module to folder
  const folder = path.join(recipesFolder, 'node_modules', testRunRecipe);
  fs.mkdirSync(folder);
  fs.writeFileSync(
    path.join(folder, 'index.js'),
    `exports.runSetup = async ({answers}) => {
  return [{message: 'works!', data: answers, level: 'info'}];
  };`
  );

  const answers = {
    test: '1',
    other: '2',
  };

  // options base
  const options = {
    method: 'POST',
    url: '/setup',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    payload: {
      recipeName: testRunRecipe,
      answers,
    },
  };

  const response = await fastify.inject(options);
  const result = JSON.parse(response.payload);

  // check answer
  expect(response.statusCode).toEqual(200);
  expect(result.success).toBeTruthy();
  expect(result.log.length).toBeGreaterThan(0);
  expect(result.log).toMatchSnapshot();

  done();
});
