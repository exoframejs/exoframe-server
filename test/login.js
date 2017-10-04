// npm packages
const fs = require('fs');
const path = require('path');
const tap = require('tap');
const jwt = require('jsonwebtoken');

// our packages
const {auth: authConfig} = require('../config');
const {getTokenCollection} = require('../src/db');

module.exports = server =>
  new Promise(async resolve => {
    let token = '';
    let phrase = '';
    let loginReqId = '';
    let deployToken = '';

    tap.test('Should get login id and login phrase', t => {
      const options = {
        method: 'GET',
        url: '/login',
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 200, 'Correct status code');
        t.ok(result.phrase, 'Has login phrase');
        t.ok(result.uid, 'Has login request uid');

        // save phrase for login request
        phrase = result.phrase;
        loginReqId = result.uid;

        t.end();
      });
    });

    tap.test('Should login with admin username and correct token', t => {
      const privateKeyPath = path.join(__dirname, 'fixtures', 'id_rsa');
      const reqToken = jwt.sign(phrase, fs.readFileSync(privateKeyPath), {algorithm: 'RS256'});

      const options = {
        method: 'POST',
        url: '/login',
        payload: {
          user: {username: 'admin'},
          token: reqToken,
          requestId: loginReqId,
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 200, 'Correct status code');
        t.ok(result.token, 'Has token');

        const decodedUser = jwt.verify(result.token, authConfig.privateKey);

        t.equal(decodedUser.user.username, 'admin', 'Login matches request');
        t.ok(decodedUser.loggedIn, 'Is logged in');

        // save token for return
        token = result.token;

        t.end();
      });
    });

    tap.test('Should generate valid deploy token', t => {
      const options = {
        method: 'POST',
        url: '/deployToken',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        payload: {
          tokenName: 'test',
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 200, 'Correct status code');
        t.ok(result.token, 'Has token');

        const decodedUser = jwt.verify(result.token, authConfig.privateKey);

        t.equal(decodedUser.user.username, 'admin', 'Login matches request');
        t.equal(decodedUser.tokenName, 'test', 'Token name matches request');
        t.ok(decodedUser.loggedIn, 'Is logged in');
        t.ok(decodedUser.deploy, 'Is logged in');

        // store for further tests
        deployToken = result.token;

        t.end();
      });
    });

    tap.test('Should allow request with valid deploy token', t => {
      const options = {
        method: 'GET',
        url: '/checkToken',
        headers: {
          Authorization: `Bearer ${deployToken}`,
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 200, 'Correct status code');
        t.ok(result.credentials, 'Has token');

        t.equal(result.message, 'Token is valid', 'Has correct message');
        t.equal(result.credentials.username, 'admin', 'Login matches request');

        t.end();
      });
    });

    tap.test('Should list generated deploy tokens', t => {
      const options = {
        method: 'GET',
        url: '/deployToken',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 200, 'Correct status code');
        t.ok(result.tokens, 'Has token');

        t.equal(result.tokens.length, 1, 'Should have on generated token');
        t.equal(result.tokens[0].tokenName, 'test', 'Should have correct token name');

        t.end();
      });
    });

    tap.test('Should remove generated deploy tokens', t => {
      const options = {
        method: 'DELETE',
        url: '/deployToken',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        payload: {
          tokenName: 'test',
        },
      };

      server.inject(options, response => {
        t.equal(response.statusCode, 204, 'Correct status code');

        // read tokens from DB and make sure there are none
        const tokens = getTokenCollection().find();
        t.equal(tokens.length, 0, 'All tokens were deleted');

        t.end();
      });
    });

    tap.test('Should not allow request with removed deploy token', t => {
      const options = {
        method: 'GET',
        url: '/checkToken',
        headers: {
          Authorization: `Bearer ${deployToken}`,
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 401, 'Correct status code');
        t.equal(result.error, 'Unauthorized', 'Correct error message');

        t.end();
      });
    });

    tap.test('Should not login without a token', t => {
      const options = {
        method: 'POST',
        url: '/login',
        payload: {
          user: {username: 'admin'},
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 401, 'Correct status code');
        t.equal(result.error, 'No token given!', 'Correct error message');

        t.end();
      });
    });

    tap.test('Should not login with a broken token', t => {
      const options = {
        method: 'POST',
        url: '/login',
        payload: {
          user: {username: 'admin'},
          token: 'not a token',
          requestId: 'asd',
        },
      };

      server.inject(options, response => {
        const result = response.result;

        t.equal(response.statusCode, 401, 'Correct status code');
        t.equal(result.error, 'Login request not found!', 'Correct error message');

        t.end();
      });
    });

    // return token
    tap.test('Return token', t => {
      resolve(token);
      t.end();
    });
  });
