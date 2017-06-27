// npm packages
const fs = require('fs');
const path = require('path');
const tap = require('tap');
const jwt = require('jsonwebtoken');

// our packages
const {auth: authConfig} = require('../config');

module.exports = server =>
  new Promise(async resolve => {
    let token = '';
    let phrase = '';
    let loginReqId = '';

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
        delete decodedUser.iat;
        delete decodedUser.exp;

        t.equal(decodedUser.user.username, 'admin', 'Login matches request');
        t.ok(decodedUser.loggedIn, 'Is logged in');

        // save token for return
        token = result.token;

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
